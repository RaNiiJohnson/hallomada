import { v } from "convex/values";
import { generatedSlug } from "../../src/lib/utils";
import {
  isContractTypeAllowedForJobType,
  requiresDurationOrStartDate,
  type ContractType,
  type JobType,
} from "../../src/lib/job-offer-options";
import {
  isAllowedPublicationTransition,
  isPublicPublicationStatus,
  type PublicationStatus,
} from "../../src/lib/publication-lifecycle";
import { authComponent } from "../auth/auth";
import { authMutation, internalMutation } from "../functions";
import { assertVerifiedUpload, consumeUploadGrant } from "../integrations/r2";
import { notifyAdministratorsOfPendingPublication } from "../notifications/admin";
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
const jobContactEmailValidator = v.string();
const applicationEmailPayloadValidator = v.object({
  applicationId: v.id("jobApplications"),
  jobTitle: v.string(),
  authorId: v.string(),
  contactEmail: v.optional(v.string()),
  cvKey: v.string(),
  coverLetter: v.optional(v.string()),
});

function assertValidJobInput(args: {
  title: string;
  company: string;
  description: string;
  type: JobType;
  contractType: ContractType;
  workMode: "onSite" | "hybrid" | "remote";
  city: string;
  duration?: string;
  startDate?: string;
  contactEmail?: string;
}, options: { requireContactEmail: boolean }) {
  if (!args.title.trim()) throwValidationError("Job title is required");
  if (!args.company.trim()) throwValidationError("Company is required");
  if (!args.description.trim()) throwValidationError("Job description is required");
  if (!isContractTypeAllowedForJobType(args.type, args.contractType)) {
    throwValidationError("This contract type is not available for the selected job type");
  }
  if (args.workMode !== "remote" && !args.city.trim()) {
    throwValidationError("City is required for on-site and hybrid jobs");
  }
  if (requiresDurationOrStartDate(args.type, args.contractType)) {
    if (!args.duration?.trim()) throwValidationError("Duration is required for this job type");
    if (!args.startDate?.trim()) throwValidationError("Start date is required for this job type");
  }
  if (options.requireContactEmail && !args.contactEmail?.trim()) {
    throwValidationError("Application contact email is required");
  }
  if (args.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.contactEmail.trim())) {
    throwValidationError("Invalid application contact email");
  }
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
    contractType: contractTypeValidator,
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

    const searchAllContent = `${args.title} ${args.type} ${args.city} ${args.contractType} ${args.description}`;

    const job = await ctx.db.insert("JobOffer", {
      ...jobArgs,
      ...(locationForWorkMode(args.workMode, location)
        ? { location: locationForWorkMode(args.workMode, location) }
        : {}),
      certificates: args.certificates ?? [],
      slug: generatedSlug(args.title),
      authorId: user._id,
      authorName: user.name,
      status: "pending",
      updatedAt: Date.now(),
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
    contractType: contractTypeValidator,
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

    const searchAllContent = `${args.title} ${args.type} ${args.city} ${args.contractType} ${args.description}`;

    const nextLocation = locationForWorkMode(args.workMode, location);
    await ctx.db.patch(id, {
      ...updateData,
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

    const existing = await ctx.db
      .query("jobApplications")
      .withIndex("by_jobId_and_candidateId", (q) =>
        q.eq("jobId", jobId).eq("candidateId", candidateId),
      )
      .unique();
    if (existing) {
      throwValidationError("You have already applied to this job");
    }

    const cvKey = applicationCvKey ?? candidate.cv ?? undefined;
    if (!cvKey) throwNotFound("CV not found");
    if (applicationCvKey) {
      await assertVerifiedUpload(ctx, {
        key: applicationCvKey,
        userId: candidateId,
        kind: "applicationCv",
      });
    }

    const applicationId = await ctx.db.insert("jobApplications", {
      jobId,
      candidateId,
      cvKey,
      coverLetter,
      appliedAt: Date.now(),
      emailStatus: "pending",
    });
    if (applicationCvKey) await consumeUploadGrant(ctx, applicationCvKey);

    const contact = await ctx.db
      .query("JobContactInfo")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .unique();

    return {
      applicationId,
      jobTitle: job.title,
      authorId: job.authorId,
      contactEmail: contact?.email,
      cvKey,
      coverLetter,
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

    const job = await ctx.db.get(jobId);
    if (!job) throwNotFound("Job not found");

    const contact = await ctx.db
      .query("JobContactInfo")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .unique();

    await ctx.db.patch(application._id, { emailStatus: "pending" });

    return {
      applicationId: application._id,
      jobTitle: job.title,
      authorId: job.authorId,
      contactEmail: contact?.email,
      cvKey: application.cvKey,
      coverLetter: application.coverLetter,
    };
  },
});

export const updateApplicationEmailStatus = internalMutation({
  args: {
    id: v.id("jobApplications"),
    emailStatus: v.union(v.literal("sent"), v.literal("failed")),
  },
  returns: v.null(),
  handler: async (ctx, { id, emailStatus }) => {
    await ctx.db.patch(id, { emailStatus });
    return null;
  },
});
