/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import schema from "../schema";
import { modules } from "../test.setup";
import { limiter } from "../rateLimits";

vi.mock("../notifications/admin", () => ({
  notifyAdministratorsOfPendingPublication: vi.fn(),
}));

const r2Mock = vi.hoisted(() => ({
  deleteObject: vi.fn(),
  getUrl: vi.fn(),
}));

vi.mock("../integrations/r2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../integrations/r2")>();
  return { ...actual, r2: r2Mock };
});

vi.mock("../posts/publicAuthorSlug", () => ({
  getPublicAuthorSlug: vi.fn(async () => "author-slug"),
}));

const authState = vi.hoisted(() => ({
  user: {
    _id: "testUserId",
    id: "testUserId",
    name: "Test User",
    email: "candidate@example.com",
    userType: "provider",
    role: "user",
    cv: "cv/owned.pdf" as string | null,
  },
}));

vi.mock("../auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/auth")>();
  return {
    ...actual,
    requireAuth: vi.fn().mockImplementation(async () => ({
      user: authState.user,
    })),
    authComponent: {
      ...actual.authComponent,
      safeGetAuthUser: vi.fn().mockImplementation(async () => ({
        _id: authState.user._id,
        name: authState.user.name,
        userType: authState.user.userType,
        cv: authState.user.cv,
      })),
    },
  };
});

describe("Jobs", () => {
  let t: ReturnType<typeof convexTest>;
  let jobId: Id<"JobOffer">;
  let jobSlug: string;

  beforeEach(async () => {
    authState.user._id = "testUserId";
    authState.user.id = "testUserId";
    authState.user.role = "user";
    authState.user.cv = "cv/owned.pdf";
    t = convexTest(schema, modules);

    jobId = await t.mutation(api.jobs.mutations.createJob, {
      title: "Job Title",
      description: "Job Description",
      company: "Job Company",
      location: { lat: 52.5294, lng: 13.4073 },
      salary: 0,
      salaryPeriod: "hour",
      type: "job",
      contractType: "CDI",
      workTime: "fullTime",
      workMode: "onSite",
      city: "City",
      contactEmail: "employer@example.com",
      duration: "Duration",
      startDate: "2022-01-01",
      certificates: [],
    });

    const job = await t.run(async (ctx) => await ctx.db.get(jobId));
    jobSlug = job!.slug;
    await t.run(async (ctx) => {
      await ctx.db.patch(jobId, { status: "active" });
    });
  });

  async function submitApplication(args: {
    jobId: Id<"JobOffer">;
    applicationCvKey?: string;
    coverLetter?: string;
  }) {
    return await t.mutation(internal.jobs.mutations.submitApplication, {
      ...args,
    });
  }

  it("should have created a job", async () => {
    const result = await t.query(api.jobs.queries.getJobWithContact, {
      slug: jobSlug,
    });
    expect(result?.title).toBe("Job Title");
    expect(result?.authorSlug).toBe("author-slug");
    expect(result).not.toHaveProperty("contact");
    expect(result?.location).toEqual({ lat: 52.53, lng: 13.41 });
    await expect(
      t.query(api.jobs.queries.getJobContactForEdit, { id: jobId }),
    ).resolves.toEqual({ email: "employer@example.com" });
    await expect(
      t.query(api.jobs.queries.getJobLocationForEdit, { id: jobId }),
    ).resolves.toEqual({ location: { lat: 52.5294, lng: 13.4073 } });

    const metadata = await t.query(api.jobs.queries.getJobMetadata, {
      slug: jobSlug,
    });
    expect(metadata).not.toHaveProperty("location");
    const listed = await t.query(api.jobs.queries.getJobs, {
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(listed.page[0]).not.toHaveProperty("location");

    authState.user._id = "anotherUserId";
    authState.user.id = "anotherUserId";
    await expect(
      t.query(api.jobs.queries.getJobLocationForEdit, { id: jobId }),
    ).resolves.toBeNull();

    authState.user._id = "adminUserId";
    authState.user.id = "adminUserId";
    authState.user.role = "admin";
    await expect(
      t.query(api.jobs.queries.getJobLocationForEdit, { id: jobId }),
    ).resolves.toBeNull();
  });

  it("requires a CDI or CDD contract and a working time for a job", async () => {
    const base = {
      title: "Contractless job",
      description: "A job without any contract information.",
      company: "Job Company",
      type: "job" as const,
      workMode: "remote" as const,
      city: "",
      contactEmail: "employer@example.com",
    };
    await expect(
      t.mutation(api.jobs.mutations.createJob, base),
    ).rejects.toThrow("A CDI or CDD contract is required");
    await expect(
      t.mutation(api.jobs.mutations.createJob, {
        ...base,
        contractType: "fullTime",
        workTime: "fullTime",
      }),
    ).rejects.toThrow("A CDI or CDD contract is required");
    await expect(
      t.mutation(api.jobs.mutations.createJob, {
        ...base,
        contractType: "CDI",
      }),
    ).rejects.toThrow("Full-time or part-time is required");
  });

  it("stores no contract for offers that are not regular jobs", async () => {
    const auPairId = await t.mutation(api.jobs.mutations.createJob, {
      title: "Au pair family",
      description: "Looking after two children.",
      company: "Family",
      type: "auPair",
      contractType: "CDD",
      workTime: "partTime",
      workMode: "onSite",
      city: "Berlin",
      duration: "12 months",
      startDate: "2030-09-01",
      contactEmail: "family@example.com",
    });
    await t.run(async (ctx) => {
      const auPair = await ctx.db.get(auPairId);
      expect(auPair?.contractType).toBeUndefined();
      expect(auPair?.workTime).toBeUndefined();
    });
  });

  it("rejects unrealistic salaries, hours and dates", async () => {
    const base = {
      title: "Numbers job",
      description: "A job to check numeric limits.",
      company: "Job Company",
      type: "job" as const,
      contractType: "CDI" as const,
      workTime: "fullTime" as const,
      workMode: "remote" as const,
      city: "",
      contactEmail: "employer@example.com",
    };
    await expect(
      t.mutation(api.jobs.mutations.createJob, { ...base, salary: -1 }),
    ).rejects.toThrow("Salary must be");
    await expect(
      t.mutation(api.jobs.mutations.createJob, { ...base, salary: Infinity }),
    ).rejects.toThrow("Salary must be");
    await expect(
      t.mutation(api.jobs.mutations.createJob, { ...base, weeklyHours: 500 }),
    ).rejects.toThrow("Weekly hours must be");
    await expect(
      t.mutation(api.jobs.mutations.createJob, {
        ...base,
        startDate: "2030-01-01",
        applicationDeadline: "2030-02-01",
      }),
    ).rejects.toThrow("deadline must be before the start date");
    await expect(
      t.mutation(api.jobs.mutations.createJob, {
        ...base,
        applicationDeadline: "tomorrow",
      }),
    ).rejects.toThrow("valid date");
  });

  it("allows a remote job without a city", async () => {
    const remoteJobId = await t.mutation(api.jobs.mutations.createJob, {
        title: "Remote Job",
        description: "A remote job without a city.",
        company: "Job Company",
        location: { lat: 48.8566, lng: 2.3522 },
        type: "job",
        contractType: "CDI",
        workTime: "fullTime",
        workMode: "remote",
        city: "",
        contactEmail: "employer@example.com",
      });

    await t.run(async (ctx) => {
      expect((await ctx.db.get(remoteJobId))?.location).toBeUndefined();
    });
  });

  it("enforces required and conditional fields on the server", async () => {
    await expect(
      t.mutation(api.jobs.mutations.createJob, {
        title: "",
        description: "A valid description.",
        company: "Job Company",
        type: "job",
        contractType: "CDI",
        workTime: "fullTime",
        workMode: "remote",
        city: "",
        contactEmail: "employer@example.com",
      }),
    ).rejects.toThrow("Job title is required");

    await expect(
      t.mutation(api.jobs.mutations.createJob, {
        title: "Fixed-term job",
        description: "A valid description.",
        company: "Job Company",
        type: "job",
        contractType: "CDD",
        workTime: "fullTime",
        workMode: "remote",
        city: "",
        contactEmail: "employer@example.com",
      }),
    ).rejects.toThrow("Duration is required for this job type");
  });

  it("enforces job type and location rules when updating", async () => {
    await expect(
      t.mutation(api.jobs.mutations.updateJob, {
        id: jobId,
        title: "Invalid update",
        description: "Job Description",
        company: "Job Company",
        type: "job",
        workMode: "remote",
        city: "",
      }),
    ).rejects.toThrow("A CDI or CDD contract is required");

    await expect(
      t.mutation(api.jobs.mutations.updateJob, {
        id: jobId,
        title: "Missing city",
        description: "Job Description",
        company: "Job Company",
        type: "job",
        contractType: "CDI",
        workTime: "fullTime",
        workMode: "onSite",
        city: "",
      }),
    ).rejects.toThrow("City is required for on-site and hybrid jobs");
  });

  it("should update a job", async () => {
    await t.mutation(api.jobs.mutations.updateJob, {
      id: jobId,
      title: "Updated Job Title",
      description: "Job Description",
      company: "Job Company",
      location: { lat: 0, lng: 0 },
      salary: 0,
      salaryPeriod: "hour",
      type: "job",
      contractType: "CDI",
      workTime: "fullTime",
      workMode: "onSite",
      city: "City",
      duration: "Duration",
      startDate: "2022-01-01",
      certificates: [],
      contactEmail: "employer@example.com",
    });

    const result = await t.query(api.jobs.queries.getJobWithContact, {
      slug: jobSlug,
    });
    expect(result?.title).toBe("Updated Job Title");
  });

  it("clears a saved map when a job becomes remote", async () => {
    await t.mutation(api.jobs.mutations.updateJob, {
      id: jobId,
      title: "Remote Job Title",
      description: "Job Description",
      company: "Job Company",
      location: { lat: 48.8566, lng: 2.3522 },
      salary: 0,
      salaryPeriod: "hour",
      type: "job",
      contractType: "CDI",
      workTime: "fullTime",
      workMode: "remote",
      city: "",
      duration: "Duration",
      startDate: "2022-01-01",
      certificates: [],
      contactEmail: "employer@example.com",
    });

    await t.run(async (ctx) => {
      expect((await ctx.db.get(jobId))?.location).toBeUndefined();
    });
    const result = await t.query(api.jobs.queries.getJobWithContact, {
      slug: jobSlug,
    });
    expect(result).not.toHaveProperty("location");
  });

  it("clears a saved map when its author turns the map off", async () => {
    await t.mutation(api.jobs.mutations.updateJob, {
      id: jobId,
      title: "Map disabled",
      description: "Job Description",
      company: "Job Company",
      location: null,
      salary: 0,
      salaryPeriod: "hour",
      type: "job",
      contractType: "CDI",
      workTime: "fullTime",
      workMode: "onSite",
      city: "City",
      duration: "Duration",
      startDate: "2022-01-01",
      certificates: [],
      contactEmail: "employer@example.com",
    });

    await expect(
      t.query(api.jobs.queries.getJobLocationForEdit, { id: jobId }),
    ).resolves.toEqual({ location: null });
    const result = await t.query(api.jobs.queries.getJobWithContact, {
      slug: jobSlug,
    });
    expect(result).not.toHaveProperty("location");
  });

  it("should delete a job", async () => {
    await expect(
      t.mutation(api.jobs.mutations.deleteJob, { id: jobId }),
    ).rejects.toThrow("Job must be closed before it can be archived");
    await t.mutation(api.jobs.mutations.setJobStatus, {
      id: jobId,
      status: "closed",
    });
    await t.mutation(api.jobs.mutations.deleteJob, {
      id: jobId,
    });

    const result = await t.query(api.jobs.queries.getJobWithContact, {
      slug: jobSlug,
    });
    expect(result?.status).toBe("archived");
  });

  it("archives a job without deleting its associated records", async () => {
    const descendants = await t.run(async (ctx) => {
      const translationId = await ctx.db.insert("jobTranslations", {
        jobId,
        language: "en",
        title: "Translation",
        city: "City",
        description: "Description",
        sourceUpdatedAt: Date.now(),
      });
      const contactId = await ctx.db.insert("JobContactInfo", {
        jobId,
        email: "owner@example.com",
      });
      const bookmarkId = await ctx.db.insert("bookmarks", {
        userId: "bookmark-owner",
        resourceId: jobId,
        resourceType: "job",
      });
      return { translationId, contactId, bookmarkId };
    });

    await t.mutation(api.jobs.mutations.setJobStatus, {
      id: jobId,
      status: "closed",
    });
    await t.mutation(api.jobs.mutations.deleteJob, { id: jobId });

    await t.run(async (ctx) => {
      expect((await ctx.db.get(jobId))?.status).toBe("archived");
      for (const id of Object.values(descendants)) {
        expect(await ctx.db.get(id)).not.toBeNull();
      }
    });
  });

  it("reserves lifecycle changes to the job owner", async () => {
    authState.user._id = "adminUserId";
    authState.user.id = "adminUserId";
    authState.user.role = "admin";

    await expect(
      t.mutation(api.jobs.mutations.setJobStatus, {
        id: jobId,
        status: "closed",
      }),
    ).rejects.toThrow("Not allowed to change this job status");
  });

  it("enforces close, reopen, archive, and restore transitions", async () => {
    await expect(
      t.mutation(api.jobs.mutations.setJobStatus, {
        id: jobId,
        status: "archived",
      }),
    ).rejects.toThrow("Invalid job status transition");

    await t.mutation(api.jobs.mutations.setJobStatus, {
      id: jobId,
      status: "closed",
    });
    await t.mutation(api.jobs.mutations.setJobStatus, {
      id: jobId,
      status: "active",
    });
    await t.mutation(api.jobs.mutations.setJobStatus, {
      id: jobId,
      status: "closed",
    });
    await t.mutation(api.jobs.mutations.setJobStatus, {
      id: jobId,
      status: "archived",
    });
    await t.mutation(api.jobs.mutations.setJobStatus, {
      id: jobId,
      status: "pending",
    });

    expect((await t.run((ctx) => ctx.db.get(jobId)))?.status).toBe("pending");
  });

  it("hides archived jobs from other members", async () => {
    await t.run(async (ctx) => {
      await ctx.db.insert("jobTranslations", {
        jobId,
        language: "fr",
        title: "Traduction",
        city: "Ville",
        description: "Description",
        sourceUpdatedAt: Date.now(),
      });
    });
    await t.mutation(api.jobs.mutations.setJobStatus, {
      id: jobId,
      status: "closed",
    });
    await t.mutation(api.jobs.mutations.deleteJob, { id: jobId });
    authState.user._id = "anotherUserId";
    authState.user.id = "anotherUserId";

    await expect(
      t.query(api.jobs.queries.getJobWithContact, { slug: jobSlug }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.jobs.queries.getJobMetadata, { slug: jobSlug }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.jobs.queries.getTranslation, {
        jobId,
        language: "fr",
      }),
    ).resolves.toBeNull();
  });

  it("should refuse deletion by another authenticated user", async () => {
    authState.user._id = "anotherUserId";
    authState.user.id = "anotherUserId";

    await expect(
      t.mutation(api.jobs.mutations.deleteJob, { id: jobId }),
    ).rejects.toThrow("Not allowed to delete this job");

    const job = await t.run(async (ctx) => await ctx.db.get(jobId));
    expect(job).not.toBeNull();
  });

  it("refuses a second application from the same candidate", async () => {
    authState.user._id = "candidateId";
    authState.user.id = "candidateId";

    await submitApplication({ jobId });

    await expect(
      submitApplication({ jobId }),
    ).rejects.toThrow("You have already applied to this job");
  });

  it("highlights Premium applications and lists them first for the job author", async () => {
    authState.user._id = "candidate-a";
    authState.user.id = "candidate-a";
    authState.user.name = "Candidate A";
    const payload = await submitApplication({ jobId, coverLetter: "Bonjour" });
    expect(payload.highlighted).toBe(true);
    expect(payload.candidateIsFounder).toBe(false);

    authState.user._id = "candidate-b";
    authState.user.id = "candidate-b";
    authState.user.name = "Candidate B";
    await submitApplication({ jobId });
    // An older application from before highlighting existed.
    await t.run(async (ctx) => {
      await ctx.db.insert("jobApplications", {
        jobId,
        candidateId: "legacy",
        cvKey: "cv/legacy.pdf",
        appliedAt: Date.now() + 1000,
      });
    });

    // Candidates cannot see the list.
    await expect(
      t.query(api.jobs.queries.listReceivedApplications, { jobId }),
    ).resolves.toBeNull();

    authState.user._id = "testUserId";
    authState.user.id = "testUserId";
    authState.user.name = "Test User";
    const received = await t.query(api.jobs.queries.listReceivedApplications, {
      jobId,
    });
    expect(received?.map((a) => a.candidateName)).toEqual([
      "Candidate B",
      "Candidate A",
      null,
    ]);
    expect(received?.[0].highlighted).toBe(true);
    expect(received?.[1].coverLetter).toBe("Bonjour");
    expect(received?.[1].cvUrl).toMatch(/application-cv\?t=/);
    expect(received?.[2]).toMatchObject({ highlighted: false, cvUrl: null });
  });

  describe("Resend webhook", () => {
    function resendEvent(type: "email.bounced" | "email.delivered") {
      const data = {
        created_at: "2026-11-02T10:00:00.000Z",
        email_id: "resend-email-1",
        from: "Hallomada <noreply@hallomada.de>",
        to: ["employer@example.com"],
        subject: "Neue Bewerbung: Job Title",
      };
      return type === "email.bounced"
        ? {
            type,
            created_at: data.created_at,
            data: {
              ...data,
              bounce: {
                type: "Permanent",
                subType: "General",
                message: "Mailbox does not exist",
              },
            },
          }
        : { type, created_at: data.created_at, data };
    }

    async function sentApplication() {
      authState.user._id = "candidateId";
      authState.user.id = "candidateId";
      const application = await submitApplication({ jobId });
      await t.mutation(internal.jobs.mutations.updateApplicationEmailStatus, {
        id: application.applicationId,
        emailStatus: "sent",
        recruiterEmailId: "resend-email-1",
        candidateLocale: "fr",
      });
      return application.applicationId;
    }

    async function authorBounceNotifications() {
      return await t.run(async (ctx) =>
        (await ctx.db.query("notifications").collect()).filter(
          (n) =>
            n.userId === "testUserId" && n.type === "job_contact_bounced",
        ),
      );
    }

    it("marks the application failed and warns the job author on bounce", async () => {
      const applicationId = await sentApplication();

      await t.mutation(internal.jobs.emailEvents.handleEmailEvent, {
        id: "resend-email-1" as never,
        event: resendEvent("email.bounced"),
      });

      const application = await t.run((ctx) => ctx.db.get(applicationId));
      expect(application?.emailStatus).toBe("failed");
      const notifications = await authorBounceNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        message: "Job Title",
        targetHref: `/jobs/${jobSlug}/edit`,
        read: false,
      });

      // The webhook can be delivered twice: nothing happens the second time.
      await t.mutation(internal.jobs.emailEvents.handleEmailEvent, {
        id: "resend-email-1" as never,
        event: resendEvent("email.bounced"),
      });
      expect(await authorBounceNotifications()).toHaveLength(1);
    });

    it("ignores delivered emails and unknown email ids", async () => {
      const applicationId = await sentApplication();

      await t.mutation(internal.jobs.emailEvents.handleEmailEvent, {
        id: "resend-email-1" as never,
        event: resendEvent("email.delivered"),
      });
      await t.mutation(internal.jobs.emailEvents.handleEmailEvent, {
        id: "some-other-email" as never,
        event: resendEvent("email.bounced"),
      });

      const application = await t.run((ctx) => ctx.db.get(applicationId));
      expect(application?.emailStatus).toBe("sent");
      expect(await authorBounceNotifications()).toHaveLength(0);
    });
  });

  it("limits how often a failed application can be resent", async () => {
    authState.user._id = "candidateId";
    authState.user.id = "candidateId";
    const application = await submitApplication({ jobId });
    await t.mutation(internal.jobs.mutations.updateApplicationEmailStatus, {
      id: application.applicationId,
      emailStatus: "failed",
    });

    vi.mocked(limiter.limit).mockResolvedValueOnce({
      ok: false,
      retryAfter: 60_000,
    });
    await expect(
      t.mutation(internal.jobs.mutations.prepareApplicationEmailRetry, {
        jobId,
      }),
    ).rejects.toThrow("Daily application resend limit reached");
    expect(limiter.limit).toHaveBeenLastCalledWith(
      expect.anything(),
      "applicationRetryPerApplication",
      { key: application.applicationId },
    );

    // Still failed, so the candidate can resend once the limit resets.
    const stored = await t.run((ctx) => ctx.db.get(application.applicationId));
    expect(stored?.emailStatus).toBe("failed");
  });

  it("retries only the failed email for the original candidate", async () => {
    authState.user._id = "candidateId";
    authState.user.id = "candidateId";

    const application = await submitApplication({
      jobId,
      coverLetter: "Original cover letter",
    });
    await t.mutation(internal.jobs.mutations.updateApplicationEmailStatus, {
      id: application.applicationId,
      emailStatus: "failed",
    });

    authState.user._id = "anotherCandidateId";
    authState.user.id = "anotherCandidateId";
    await expect(
      t.mutation(internal.jobs.mutations.prepareApplicationEmailRetry, {
        jobId,
      }),
    ).rejects.toThrow("This application is not awaiting an email retry");

    authState.user._id = "candidateId";
    authState.user.id = "candidateId";
    await expect(
      t.mutation(internal.jobs.mutations.prepareApplicationEmailRetry, {
        jobId,
      }),
    ).resolves.toMatchObject({
      applicationId: application.applicationId,
      cvToken: application.cvToken,
      coverLetter: "Original cover letter",
    });

    await expect(
      t.query(api.jobs.queries.hasCurrentUserAppliedToJob, { jobId }),
    ).resolves.toBe("pending");
  });

  it("only reports an application to its candidate", async () => {
    authState.user._id = "candidateId";
    authState.user.id = "candidateId";
    await submitApplication({ jobId });

    await expect(
      t.query(api.jobs.queries.hasCurrentUserAppliedToJob, { jobId }),
    ).resolves.toBe("pending");
  });

  it("uses an application CV without changing the profile CV", async () => {
    authState.user._id = "candidateId";
    authState.user.id = "candidateId";
    const profileCv = authState.user.cv;

    await t.run(async (ctx) => {
      await ctx.db.insert("uploadGrants", {
        key: "applicationCv/candidate.pdf",
        userId: "candidateId",
        kind: "applicationCv",
        expectedContentType: "application/pdf",
        maxSize: 5 * 1024 * 1024,
        verified: true,
      });
    });

    await submitApplication({
      jobId,
      applicationCvKey: "applicationCv/candidate.pdf",
    });

    await t.run(async (ctx) => {
      const application = (await ctx.db.query("jobApplications").collect()).find(
        (entry) =>
          entry.jobId === jobId && entry.candidateId === "candidateId",
      );
      expect(application?.cvKey).toBe("applicationCv/candidate.pdf");
    });
    expect(authState.user.cv).toBe(profileCv);
  });

  it("refuses an application CV that was not verified for the candidate", async () => {
    authState.user._id = "candidateId";
    authState.user.id = "candidateId";

    await expect(
      submitApplication({
        jobId,
        applicationCvKey: "applicationCv/not-owned.pdf",
      }),
    ).rejects.toThrow("Upload key is not verified for the current user");
  });

  it("refuses an application when the offer is closed", async () => {
    await t.mutation(api.jobs.mutations.setJobStatus, {
      id: jobId,
      status: "closed",
    });
    authState.user._id = "candidateId";
    authState.user.id = "candidateId";

    await expect(
      submitApplication({ jobId }),
    ).rejects.toThrow("This job is no longer accepting applications");
  });

  it("does not include closed offers in the public list", async () => {
    await t.mutation(api.jobs.mutations.setJobStatus, {
      id: jobId,
      status: "closed",
    });

    const result = await t.query(api.jobs.queries.getJobs, {
      paginationOpts: { cursor: null, numItems: 10 },
    });

    expect(result.page.some((job) => job._id === jobId)).toBe(false);
  });

  it("continues past closed offers when paginating public jobs", async () => {
    await t.mutation(api.jobs.mutations.setJobStatus, {
      id: jobId,
      status: "closed",
    });

    const activeJobId = await t.mutation(api.jobs.mutations.createJob, {
      title: "Active Job",
      description: "Job Description",
      company: "Job Company",
      location: { lat: 0, lng: 0 },
      salary: 0,
      salaryPeriod: "hour",
      type: "job",
      contractType: "CDI",
      workTime: "fullTime",
      workMode: "onSite",
      city: "City",
      contactEmail: "employer@example.com",
      duration: "Duration",
      startDate: "2022-01-01",
      certificates: [],
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(activeJobId, { status: "active" });
    });

    const result = await t.query(api.jobs.queries.getJobs, {
      paginationOpts: { cursor: null, numItems: 1 },
    });

    expect(result.page.map((job) => job._id)).toContain(activeJobId);
  });

  describe("application CV link", () => {
    beforeEach(() => {
      r2Mock.deleteObject.mockReset();
      r2Mock.getUrl.mockReset();
    });

    async function applyAs(candidateId: string, applicationCvKey?: string) {
      authState.user._id = candidateId;
      authState.user.id = candidateId;
      return await submitApplication({ jobId, applicationCvKey });
    }

    it("gives every application its own long-lived, unguessable token", async () => {
      const first = await applyAs("candidateOne");
      const second = await applyAs("candidateTwo");

      expect(first.cvToken).toMatch(/^[0-9a-f]{64}$/);
      expect(second.cvToken).not.toBe(first.cvToken);
      await expect(
        t.query(internal.jobs.applicationCv.resolveCvToken, {
          token: first.cvToken,
        }),
      ).resolves.toEqual({ status: "ok", cvKey: "cv/owned.pdf" });
      await t.run(async (ctx) => {
        const row = await ctx.db.get(first.applicationId);
        expect(row?.cvExpiresAt).toBeGreaterThan(
          Date.now() + 80 * 24 * 60 * 60 * 1000,
        );
      });
    });

    it("answers unknown and expired tokens differently", async () => {
      const application = await applyAs("candidateOne");
      await expect(
        t.query(internal.jobs.applicationCv.resolveCvToken, {
          token: "0".repeat(64),
        }),
      ).resolves.toEqual({ status: "notFound" });

      await t.run(async (ctx) => {
        await ctx.db.patch(application.applicationId, {
          cvExpiresAt: Date.now() - 1000,
        });
      });
      await expect(
        t.query(internal.jobs.applicationCv.resolveCvToken, {
          token: application.cvToken,
        }),
      ).resolves.toEqual({ status: "expired" });
    });

    it("redirects the link to a short-lived signed URL", async () => {
      r2Mock.getUrl.mockResolvedValue("https://r2.example.test/signed.pdf");
      const application = await applyAs("candidateOne");

      const response = await t.fetch(
        `/application-cv?t=${application.cvToken}`,
        { redirect: "manual" },
      );
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe(
        "https://r2.example.test/signed.pdf",
      );
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(r2Mock.getUrl).toHaveBeenCalledWith("cv/owned.pdf", {
        expiresIn: 300,
      });

      const unknown = await t.fetch(`/application-cv?t=${"0".repeat(64)}`);
      expect(unknown.status).toBe(404);
      const malformed = await t.fetch("/application-cv?t=short");
      expect(malformed.status).toBe(404);
    });

    it("keeps the CV reachable after the candidate deletes their profile CV", async () => {
      const application = await applyAs("candidateOne");
      // A profile CV removal must not end access: the link is independent of it.
      authState.user.cv = null;
      await expect(
        t.query(internal.jobs.applicationCv.resolveCvToken, {
          token: application.cvToken,
        }),
      ).resolves.toEqual({ status: "ok", cvKey: "cv/owned.pdf" });
    });

    it("purges expired CVs, deleting the one-off file but never a shared one", async () => {
      const own = await applyAs("candidateOne");
      await t.run(async (ctx) => {
        await ctx.db.patch(own.applicationId, {
          cvKey: "applicationCv/one-off.pdf",
          cvExpiresAt: Date.now() - 1000,
        });
      });
      const sharedA = await applyAs("candidateTwo", undefined);
      await t.run(async (ctx) => {
        await ctx.db.patch(sharedA.applicationId, {
          cvKey: "applicationCv/shared.pdf",
          cvExpiresAt: Date.now() - 1000,
        });
      });
      const sharedB = await applyAs("candidateThree", undefined);
      await t.run(async (ctx) => {
        await ctx.db.patch(sharedB.applicationId, {
          cvKey: "applicationCv/shared.pdf",
        });
      });

      await t.mutation(internal.jobs.applicationCv.purgeExpiredApplicationCvs, {});

      expect(r2Mock.deleteObject).toHaveBeenCalledTimes(1);
      expect(r2Mock.deleteObject).toHaveBeenCalledWith(
        expect.anything(),
        "applicationCv/one-off.pdf",
      );
      await t.run(async (ctx) => {
        const purged = await ctx.db.get(own.applicationId);
        expect(purged?.cvPurgedAt).toBeDefined();
        expect(purged?.cvExpiresAt).toBeUndefined();
        const sharedRow = await ctx.db.get(sharedA.applicationId);
        expect(sharedRow?.cvPurgedAt).toBeDefined();
        const stillLive = await ctx.db.get(sharedB.applicationId);
        expect(stillLive?.cvPurgedAt).toBeUndefined();
      });
      await expect(
        t.query(internal.jobs.applicationCv.resolveCvToken, {
          token: own.cvToken,
        }),
      ).resolves.toEqual({ status: "expired" });

      // A second run finds nothing left to purge.
      await t.mutation(internal.jobs.applicationCv.purgeExpiredApplicationCvs, {});
      expect(r2Mock.deleteObject).toHaveBeenCalledTimes(1);
    });

    it("does not rebuild a link for a purged application", async () => {
      const application = await applyAs("candidateOne");
      await t.run(async (ctx) => {
        await ctx.db.patch(application.applicationId, {
          cvPurgedAt: Date.now(),
          cvExpiresAt: undefined,
        });
      });
      await t.mutation(internal.jobs.mutations.updateApplicationEmailStatus, {
        id: application.applicationId,
        emailStatus: "failed",
      });
      await expect(
        t.mutation(internal.jobs.mutations.prepareApplicationEmailRetry, {
          jobId,
        }),
      ).rejects.toThrow("no longer available");
    });
  });

  it("refuses applications once the deadline has passed", async () => {
    await t.run(async (ctx) => {
      await ctx.db.patch(jobId, { applicationDeadline: "2000-01-01" });
    });
    authState.user._id = "lateCandidate";
    authState.user.id = "lateCandidate";
    await expect(submitApplication({ jobId })).rejects.toThrow(
      "application deadline for this job has passed",
    );

    const tomorrow = new Date(Date.now() + 86_400_000)
      .toISOString()
      .slice(0, 10);
    await t.run(async (ctx) => {
      await ctx.db.patch(jobId, { applicationDeadline: tomorrow });
    });
    await expect(submitApplication({ jobId })).resolves.toMatchObject({
      applicationId: expect.anything(),
    });
  });

  it("does not allow the generic profile mutation to replace the CV key", async () => {
    await expect(
      t.mutation(
        api.auth.users.updateUser,
        { patch: { cv: "cv/another-user.pdf" } } as never,
      ),
    ).rejects.toThrow();
  });
});
