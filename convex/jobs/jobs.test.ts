/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import schema from "../schema";
import { modules } from "../test.setup";

vi.mock("../notifications/admin", () => ({
  notifyAdministratorsOfPendingPublication: vi.fn(),
}));

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
      contractType: "fullTime",
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

  it("rejects a contract that is incompatible with the job type", async () => {
    await expect(
      t.mutation(api.jobs.mutations.createJob, {
        title: "Invalid freelance job",
        description: "A job with an invalid contract combination.",
        company: "Job Company",
        type: "freelance",
        contractType: "CDI",
        workMode: "remote",
        city: "",
        contactEmail: "employer@example.com",
      }),
    ).rejects.toThrow("not available for the selected job type");
  });

  it("allows a remote job without a city", async () => {
    const remoteJobId = await t.mutation(api.jobs.mutations.createJob, {
        title: "Remote Job",
        description: "A remote job without a city.",
        company: "Job Company",
        location: { lat: 48.8566, lng: 2.3522 },
        type: "job",
        contractType: "CDI",
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
        type: "freelance",
        contractType: "CDI",
        workMode: "remote",
        city: "",
      }),
    ).rejects.toThrow("not available for the selected job type");

    await expect(
      t.mutation(api.jobs.mutations.updateJob, {
        id: jobId,
        title: "Missing city",
        description: "Job Description",
        company: "Job Company",
        type: "job",
        contractType: "fullTime",
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
      contractType: "fullTime",
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
      contractType: "fullTime",
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
      contractType: "fullTime",
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
      cvKey: "cv/owned.pdf",
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
      contractType: "fullTime",
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

  it("does not allow the generic profile mutation to replace the CV key", async () => {
    await expect(
      t.mutation(
        api.auth.users.updateUser,
        { patch: { cv: "cv/another-user.pdf" } } as never,
      ),
    ).rejects.toThrow();
  });
});
