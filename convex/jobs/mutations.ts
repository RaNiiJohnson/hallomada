import { v } from "convex/values";
import { generatedSlug } from "../../src/lib/utils";
import {
  MAX_SALARY,
  MAX_WEEKLY_HOURS,
  isDateOnly,
  jobTypeHasContract,
  requiresDurationOrStartDate,
  selectableContractTypes,
  type ContractType,
  type JobType,
  type WorkTime,
} from "../../src/lib/job-offer-options";
import {
  isAllowedPublicationTransition,
  isPublicPublicationStatus,
  type PublicationStatus,
} from "../../src/lib/publication-lifecycle";
import type { QueryCtx } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { SITE_URL } from "../emails/layout";
import { isFounderUser } from "../founders";
import { hasHighlight } from "../premium";
import {
  APPLICATION_CV_RETENTION_MS,
  ensureCvToken,
  generateCvToken,
} from "./applicationCv";
import { authMutation, internalMutation } from "../functions";
import { assertVerifiedUpload, consumeUploadGrant } from "../integrations/r2";
import { notifyAdministratorsOfPendingPublication } from "../notifications/admin";
import { assertApplicationQuota } from "../applicationQuotas";
import { consumePublicationQuota } from "../publicationQuotas";
import { limiter } from "../rateLimits";
import {
  throwForbidden,
  throwLimitReached,
  throwNotFound,
  throwValidationError,
} from "../utils/errors";
import {
  assertStringList,
  assertTextLimits,
  MAX_LENGTH,
} from "../utils/limits";

const jobStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("closed"),
  v.literal("archived"),
);

const jobTypeValidator = v.union(
  v.literal("auPair"), v.literal("training"), v.literal("voluntary"),
  v.literal("internship"), v.literal("miniJob"), v.literal("job"),
  v.literal("freelance"), v.literal("scholarship"),
);
const contractTypeValidator = v.union(
  v.literal("CDI"), v.literal("CDD"), v.literal("FSJ/FOJ/BFD"),
  v.literal("fullTime"), v.literal("partTime"), v.literal("freelance"),
  v.literal("apprenticeship"),
);
const workTimeValidator = v.union(v.literal("fullTime"), v.literal("partTime"));
const jobContactEmailValidator = v.string();
const applicationEmailPayloadValidator = v.object({
  applicationId: v.id("jobApplications"),
  jobTitle: v.string(),
  jobSlug: v.string(),
  company: v.string(),
  authorId: v.string(),
  contactEmail: v.optional(v.string()),
  cvToken: v.string(),
  coverLetter: v.optional(v.string()),
  highlighted: v.boolean(),
  candidateCity: v.optional(v.string()),
  candidateProfileUrl: v.optional(v.string()),
  candidateIsFounder: v.boolean(),
});

/** Public details shown to the recruiter on a highlighted application. */
async function candidateHighlight(
  ctx: QueryCtx,
  candidate: {
    _id: string;
    slug?: string | null;
    city?: string | null;
    isPublic?: boolean | null;
  },
  highlighted: boolean,
) {
  const isPublic = candidate.isPublic !== false;
  return {
    highlighted,
    candidateCity: highlighted && candidate.city ? candidate.city : undefined,
    candidateProfileUrl:
      highlighted && isPublic && candidate.slug
        ? `${SITE_URL}/de/hl/${candidate.slug}`
        : undefined,
    candidateIsFounder: highlighted && (await isFounderUser(ctx, candidate._id)),
  };
}

function assertValidJobInput(args: {
  title: string;
  company: string;
  description: string;
  type: JobType;
  contractType?: ContractType;
  workTime?: WorkTime;
  workMode: "onSite" | "hybrid" | "remote";
  city: string;
  duration?: string;
  startDate?: string;
  applicationDeadline?: string;
  salary?: number;
  weeklyHours?: number;
  contactEmail?: string;
}, options: { requireContactEmail: boolean }) {
  if (!args.title.trim()) throwValidationError("Job title is required");
  if (!args.company.trim()) throwValidationError("Company is required");
  if (!args.description.trim()) throwValidationError("Job description is required");
  if (jobTypeHasContract(args.type)) {
    const contractType = args.contractType;
    if (
      !contractType ||
      !(selectableContractTypes as readonly string[]).includes(contractType)
    ) {
      throwValidationError("A CDI or CDD contract is required for a job");
    }
    if (!args.workTime) throwValidationError("Full-time or part-time is required for a job");
  }
  if (args.workMode !== "remote" && !args.city.trim()) {
    throwValidationError("City is required for on-site and hybrid jobs");
  }
  if (requiresDurationOrStartDate(args.type, args.contractType)) {
    if (!args.duration?.trim()) throwValidationError("Duration is required for this job type");
    if (!args.startDate?.trim()) throwValidationError("Start date is required for this job type");
  }
  if (
    args.salary !== undefined &&
    !(Number.isFinite(args.salary) && args.salary >= 0 && args.salary <= MAX_SALARY)
  ) {
    throwValidationError("Salary must be a positive amount within a realistic range");
  }
  if (
    args.weeklyHours !== undefined &&
    !(
      Number.isFinite(args.weeklyHours) &&
      args.weeklyHours > 0 &&
      args.weeklyHours <= MAX_WEEKLY_HOURS
    )
  ) {
    throwValidationError(`Weekly hours must be between 1 and ${MAX_WEEKLY_HOURS}`);
  }
  for (const [field, value] of [
    ["Start date", args.startDate],
    ["Application deadline", args.applicationDeadline],
  ] as const) {
    if (value && !isDateOnly(value)) {
      throwValidationError(`${field} must be a valid date (YYYY-MM-DD)`);
    }
  }
  if (
    args.startDate &&
    args.applicationDeadline &&
    args.applicationDeadline > args.startDate
  ) {
    throwValidationError("The application deadline must be before the start date");
  }
  if (options.requireContactEmail && !args.contactEmail?.trim()) {
    throwValidationError("Application contact email is required");
  }
  if (args.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.contactEmail.trim())) {
    throwValidationError("Invalid application contact email");
  }
}

/** Only regular jobs keep a contract; everything else is cleared server-side. */
function normalizeContract(args: {
  type: JobType;
  contractType?: ContractType;
  workTime?: WorkTime;
}) {
  return jobTypeHasContract(args.type)
    ? { contractType: args.contractType, workTime: args.workTime }
    : { contractType: undefined, workTime: undefined };
}

function assertJobTextLimits(args: {
  title: string;
  company: string;
  description: string;
  city: string;
  remoteLocation?: string;
  duration?: string;
  startDate?: string;
  applicationDeadline?: string;
  sector?: string;
  benefits?: string;
  externalApplicationUrl?: string;
  trainingRequirements?: string;
  contactEmail?: string;
  certificates?: string[];
}) {
  assertTextLimits(args, {
    title: MAX_LENGTH.title,
    company: MAX_LENGTH.name,
    city: MAX_LENGTH.name,
    remoteLocation: MAX_LENGTH.shortText,
    duration: MAX_LENGTH.name,
    startDate: MAX_LENGTH.name,
    applicationDeadline: MAX_LENGTH.name,
    sector: MAX_LENGTH.name,
    description: MAX_LENGTH.description,
    benefits: MAX_LENGTH.description,
    trainingRequirements: MAX_LENGTH.description,
    externalApplicationUrl: MAX_LENGTH.url,
    contactEmail: MAX_LENGTH.email,
  });
  assertStringList("certificates", args.certificates);
}

function locationForWorkMode(
  workMode: "onSite" | "hybrid" | "remote",
  location: { lat: number; lng: number } | null | undefined,
) {
  // Remote offers never retain a map location, including when the mutation is
  // called directly instead of through the form.
  return workMode === "remote" || location === null ? undefined : location;
}

function isJobActive(status: PublicationStatus | undefined) {
  return isPublicPublicationStatus(status);
}

export const createJob = authMutation({
  args: {
    title: v.string(),
    type: jobTypeValidator,
    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
    contractType: v.optional(contractTypeValidator),
    workTime: v.optional(workTimeValidator),
    city: v.string(),
    workMode: v.union(v.literal("onSite"), v.literal("hybrid"), v.literal("remote")),
    remoteLocation: v.optional(v.string()),
    duration: v.optional(v.string()),
    startDate: v.optional(v.string()),
    applicationDeadline: v.optional(v.string()),
    company: v.string(),
    description: v.string(),
    certificates: v.optional(v.array(v.string())),
    salary: v.optional(v.number()),
    salaryPeriod: v.optional(v.union(
      v.literal("hour"),
      v.literal("month"),
      v.literal("year"),
    )),
    sector: v.optional(v.string()),
    benefits: v.optional(v.string()),
    externalApplicationUrl: v.optional(v.string()),
    weeklyHours: v.optional(v.number()),
    trainingRequirements: v.optional(v.string()),
    contactEmail: jobContactEmailValidator,
  },
  handler: async (ctx, args) => {
    const user = ctx.user;

    assertJobTextLimits(args);
    assertValidJobInput(args, { requireContactEmail: true });
    await consumePublicationQuota(ctx, "job", user._id);
    const { contactEmail, location, ...jobArgs } = args;

    const searchAllContent = `${args.title} ${args.type} ${args.city} ${args.contractType ?? ""} ${args.description}`;

    const job = await ctx.db.insert("JobOffer", {
      ...jobArgs,
      ...normalizeContract(args),
      ...(locationForWorkMode(args.workMode, location)
        ? { location: locationForWorkMode(args.workMode, location) }
        : {}),
      certificates: args.certificates ?? [],
      slug: generatedSlug(args.title),
      authorId: user._id,
      authorName: user.name,
      status: "pending",
      updatedAt: Date.now(),
      listedAt: Date.now(),
      searchAll: searchAllContent,
    });
    await ctx.db.insert("JobContactInfo", {
      jobId: job,
      email: contactEmail.trim().toLowerCase(),
    });
    await notifyAdministratorsOfPendingPublication(ctx, {
      resourceType: "job",
      title: args.title,
      authorName: user.name,
    });

    // await posthog.capture(ctx, {
    //   distinctId: posthogDistinctId(user._id),
    //   event: "job_created",
    //   properties: {
    //     job_id: job,
    //     type: args.type,
    //     city: args.city,
    //     contract_type: args.contractType,
    //   },
    // });

    return job;
  },
});

export const updateJob = authMutation({
  args: {
    id: v.id("JobOffer"),
    title: v.string(),
    type: jobTypeValidator,
    location: v.optional(
      v.union(
        v.object({
          lat: v.number(),
          lng: v.number(),
        }),
        v.null(),
      ),
    ),
    contractType: v.optional(contractTypeValidator),
    workTime: v.optional(workTimeValidator),
    city: v.string(),
    workMode: v.union(v.literal("onSite"), v.literal("hybrid"), v.literal("remote")),
    remoteLocation: v.optional(v.string()),
    duration: v.optional(v.string()),
    startDate: v.optional(v.string()),
    applicationDeadline: v.optional(v.string()),
    company: v.string(),
    description: v.string(),
    certificates: v.optional(v.array(v.string())),
    salary: v.optional(v.number()),
    salaryPeriod: v.optional(v.union(
      v.literal("hour"),
      v.literal("month"),
      v.literal("year"),
    )),
    sector: v.optional(v.string()),
    benefits: v.optional(v.string()),
    externalApplicationUrl: v.optional(v.string()),
    weeklyHours: v.optional(v.number()),
    trainingRequirements: v.optional(v.string()),
    contactEmail: v.optional(jobContactEmailValidator),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throwNotFound("Job not found");

    const isOwner = existing.authorId === ctx.user._id;
    const isAdmin = ctx.user.role === "admin";
    if (!isOwner && !isAdmin) {
      throwForbidden("Not allowed to update this job");
    }

    // Remove id from args before updating because it's not a field of the document
    const { id, contactEmail, location, ...updateData } = args;
    assertJobTextLimits(args);
    assertValidJobInput(args, { requireContactEmail: false });

    const searchAllContent = `${args.title} ${args.type} ${args.city} ${args.contractType ?? ""} ${args.description}`;

    const nextLocation = locationForWorkMode(args.workMode, location);
    await ctx.db.patch(id, {
      ...updateData,
      ...normalizeContract(args),
      // Omitted locations preserve a previously selected map. `null` (the
      // off switch) and `remote` both remove it explicitly.
      ...(args.workMode === "remote" || location !== undefined
        ? { location: nextLocation }
        : {}),
      searchAll: searchAllContent,
      ...(!isAdmin ? { status: "pending" as const } : {}),
      updatedAt: Date.now(),
    });
    if (contactEmail) {
      const currentContact = await ctx.db.query("JobContactInfo").withIndex("by_jobId", (q) => q.eq("jobId", id)).unique();
      if (currentContact) await ctx.db.patch(currentContact._id, { email: contactEmail.trim().toLowerCase() });
      else await ctx.db.insert("JobContactInfo", { jobId: id, email: contactEmail.trim().toLowerCase() });
    }
    if (!isAdmin && existing.status !== "pending") {
      await notifyAdministratorsOfPendingPublication(ctx, {
        resourceType: "job",
        title: args.title,
        authorName: ctx.user.name,
      });
    }
  },
});

export const deleteJob = authMutation({
  args: {
    id: v.id("JobOffer"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get("JobOffer", args.id);
    if (!existing) throwNotFound("Job not found");

    if (existing.authorId !== ctx.user._id) {
      throwForbidden("Not allowed to delete this job");
    }
    if (!isAllowedPublicationTransition(existing.status, "archived")) {
      throwValidationError("Job must be closed before it can be archived");
    }

    await ctx.db.patch(args.id, { status: "archived", updatedAt: Date.now() });

    // await posthog.capture(ctx, {
    //   distinctId: posthogDistinctId(user._id),
    //   event: "job_deleted",
    //   properties: { job_id: args.id },
    // });
    return null;
  },
});

export const setJobStatus = authMutation({
  args: { id: v.id("JobOffer"), status: jobStatusValidator },
  returns: v.null(),
  handler: async (ctx, { id, status }) => {
    const job = await ctx.db.get(id);
    if (!job) throwNotFound("Job not found");
    if (job.authorId !== ctx.user._id) {
      throwForbidden("Not allowed to change this job status");
    }
    if (!isAllowedPublicationTransition(job.status, status)) {
      throwValidationError("Invalid job status transition");
    }
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
    return null;
  },
});

export const submitApplication = internalMutation({
  args: {
    jobId: v.id("JobOffer"),
    applicationCvKey: v.optional(v.string()),
    coverLetter: v.optional(v.string()),
  },
  returns: applicationEmailPayloadValidator,
  handler: async (ctx, { jobId, applicationCvKey, coverLetter }) => {
    const candidate = await authComponent.safeGetAuthUser(ctx);
    if (!candidate) throwForbidden("Authentication required");
    const candidateId = candidate._id;

    assertTextLimits({ coverLetter }, { coverLetter: MAX_LENGTH.description });
    const rate = await limiter.limit(ctx, "applicationPerUser", {
      key: candidateId,
    });
    if (!rate.ok) {
      throwLimitReached("Daily application limit reached", {
        retryAfter: rate.retryAfter ?? 0,
      });
    }

    const job = await ctx.db.get(jobId);
    if (!job) throwNotFound("Job not found");
    if (!isJobActive(job.status)) {
      throwValidationError("This job is no longer accepting applications");
    }
    if (job.authorId === candidateId) {
      throwForbidden("You cannot apply to your own job");
    }
    // Deadlines are plain dates (YYYY-MM-DD) and inclusive of the whole day.
    if (
      job.applicationDeadline &&
      job.applicationDeadline < new Date().toISOString().slice(0, 10)
    ) {
      throwValidationError("The application deadline for this job has passed");
    }

    const existing = await ctx.db
      .query("jobApplications")
      .withIndex("by_jobId_and_candidateId", (q) =>
        q.eq("jobId", jobId).eq("candidateId", candidateId),
      )
      .unique();
    if (existing) {
      throwValidationError("You have already applied to this job");
    }

    // Free members: shared monthly quota with rental dossiers.
    await assertApplicationQuota(ctx, candidateId);

    const cvKey = applicationCvKey ?? candidate.cv ?? undefined;
    if (!cvKey) throwNotFound("CV not found");
    if (applicationCvKey) {
      await assertVerifiedUpload(ctx, {
        key: applicationCvKey,
        userId: candidateId,
        kind: "applicationCv",
      });
    }

    const now = Date.now();
    const cvToken = generateCvToken();
    const highlighted = await hasHighlight(ctx, candidateId);
    const applicationId = await ctx.db.insert("jobApplications", {
      jobId,
      candidateId,
      candidateName: candidate.name,
      cvKey,
      cvToken,
      cvExpiresAt: now + APPLICATION_CV_RETENTION_MS,
      coverLetter,
      appliedAt: now,
      emailStatus: "pending",
      highlighted,
    });
    if (applicationCvKey) await consumeUploadGrant(ctx, applicationCvKey);

    const contact = await ctx.db
      .query("JobContactInfo")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .unique();

    return {
      applicationId,
      jobTitle: job.title,
      jobSlug: job.slug,
      company: job.company,
      authorId: job.authorId,
      contactEmail: contact?.email,
      cvToken,
      coverLetter,
      ...(await candidateHighlight(ctx, candidate, highlighted)),
    };
  },
});

export const prepareApplicationEmailRetry = internalMutation({
  args: { jobId: v.id("JobOffer") },
  returns: applicationEmailPayloadValidator,
  handler: async (ctx, { jobId }) => {
    const candidate = await authComponent.safeGetAuthUser(ctx);
    if (!candidate) throwForbidden("Authentication required");

    const application = await ctx.db
      .query("jobApplications")
      .withIndex("by_jobId_and_candidateId", (q) =>
        q.eq("jobId", jobId).eq("candidateId", candidate._id),
      )
      .unique();
    if (!application || application.emailStatus !== "failed") {
      throwValidationError("This application is not awaiting an email retry");
    }
    const rate = await limiter.limit(ctx, "applicationRetryPerApplication", {
      key: application._id,
    });
    if (!rate.ok) {
      throwLimitReached("Daily application resend limit reached", {
        retryAfter: rate.retryAfter ?? 0,
      });
    }

    const job = await ctx.db.get(jobId);
    if (!job) throwNotFound("Job not found");

    const contact = await ctx.db
      .query("JobContactInfo")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .unique();

    const cvToken = await ensureCvToken(ctx, application);
    if (!cvToken) throwValidationError("This application's CV is no longer available");
    await ctx.db.patch(application._id, { emailStatus: "pending" });

    return {
      applicationId: application._id,
      jobTitle: job.title,
      jobSlug: job.slug,
      company: job.company,
      authorId: job.authorId,
      contactEmail: contact?.email,
      cvToken,
      coverLetter: application.coverLetter,
      ...(await candidateHighlight(
        ctx,
        candidate,
        application.highlighted === true,
      )),
    };
  },
});

export const updateApplicationEmailStatus = internalMutation({
  args: {
    id: v.id("jobApplications"),
    emailStatus: v.union(v.literal("sent"), v.literal("failed")),
    recruiterEmailId: v.optional(v.string()),
    candidateLocale: v.optional(
      v.union(v.literal("fr"), v.literal("en"), v.literal("de")),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch);
    return null;
  },
});
