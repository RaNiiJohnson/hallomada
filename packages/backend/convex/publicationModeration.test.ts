/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import { notifyAdministratorsOfPendingPublication } from "./notifications/admin";

vi.mock("./notifications/admin", () => ({
  notifyAdministratorsOfPendingPublication: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  actor: {
    _id: "member-1",
    id: "member-1",
    name: "Member One",
    role: "user" as "user" | "admin",
    userType: "seeker",
  },
}));

vi.mock("./auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auth/auth")>();
  return {
    ...actual,
    requireAuth: vi.fn(async () => ({ user: authState.actor })),
    requireAdmin: vi.fn(async () => {
      if (authState.actor.role !== "admin") {
        throw new Error("Admin access required");
      }
      return { user: authState.actor };
    }),
    authComponent: {
      ...actual.authComponent,
      safeGetAuthUser: vi.fn(async () => authState.actor),
    },
  };
});

describe("publication moderation", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    authState.actor._id = "member-1";
    authState.actor.id = "member-1";
    authState.actor.name = "Member One";
    authState.actor.role = "user";
    authState.actor.userType = "seeker";
    vi.mocked(notifyAdministratorsOfPendingPublication).mockClear();
    t = convexTest(schema, modules);
  });

  it("lets any authenticated member submit jobs and listings as pending", async () => {
    const jobId = await t.mutation(api.jobs.mutations.createJob, {
      title: "Member job",
      type: "job",
      contractType: "CDI",
      workTime: "fullTime",
      city: "",
      workMode: "remote",
      company: "Member company",
      description: "A job submitted by a regular member.",
      contactEmail: "jobs@example.com",
    });
    const listingId = await t.mutation(
      api.listings.mutations.createListing,
      {
        title: "Member listing",
        propertyType: "studio",
        listingMode: "rent",
        acceptsRentalFile: true,
        city: "Berlin",
        price: 900,
        area: 30,
        bedrooms: 1,
        bathrooms: 1,
        floor: 2,
        pets: false,
        images: [],
        description: "A housing listing submitted by a regular member.",
        extras: [],
        availableFrom: 1_800_000_000_000,
        contact: { email: "owner@example.com" },
      },
    );

    await t.run(async (ctx) => {
      expect((await ctx.db.get(jobId))?.status).toBe("pending");
      expect((await ctx.db.get(listingId))?.status).toBe("pending");
    });

    const ownerJobs = await t.query(api.jobs.queries.getJobs, {
      paginationOpts: { cursor: null, numItems: 10 },
    });
    const ownerListings = await t.query(api.listings.queries.getListing, {
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(ownerJobs.page.map((job) => job._id)).toContain(jobId);
    expect(ownerListings.page.map((listing) => listing._id)).toContain(
      listingId,
    );
    expect(notifyAdministratorsOfPendingPublication).toHaveBeenCalledTimes(2);

    const slugs = await t.run(async (ctx) => ({
      job: (await ctx.db.get(jobId))!.slug,
      listing: (await ctx.db.get(listingId))!.slug,
    }));
    authState.actor._id = "another-member";
    authState.actor.id = "another-member";
    await expect(
      t.query(api.jobs.queries.getJobWithContact, { slug: slugs.job }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.listings.queries.getListingWithContact, {
        slug: slugs.listing,
      }),
    ).resolves.toBeNull();

    const otherMemberJobs = await t.query(api.jobs.queries.getJobs, {
      paginationOpts: { cursor: null, numItems: 10 },
    });
    const otherMemberListings = await t.query(
      api.listings.queries.getListing,
      { paginationOpts: { cursor: null, numItems: 10 } },
    );
    expect(otherMemberJobs.page.map((job) => job._id)).not.toContain(jobId);
    expect(
      otherMemberListings.page.map((listing) => listing._id),
    ).not.toContain(listingId);
  });

  it("lets an admin approve or reject pending content and notifies its author", async () => {
    const { jobId, listingId } = await t.run(async (ctx) => {
      const now = Date.now();
      const jobId = await ctx.db.insert("JobOffer", {
        title: "Pending job",
        type: "job",
        slug: "pending-job",
        contractType: "CDI",
        workTime: "fullTime",
        city: "Berlin",
        workMode: "onSite",
        company: "Example",
        description: "Pending description",
        authorId: "job-author",
        authorName: "Job Author",
        status: "pending",
        updatedAt: now,
      });
      const listingId = await ctx.db.insert("RealestateListing", {
        title: "Pending listing",
        propertyType: "studio",
        listingMode: "rent",
        acceptsRentalFile: true,
        status: "pending",
        slug: "pending-listing",
        city: "Berlin",
        price: 900,
        currency: "EUR",
        period: "month",
        area: 30,
        bedrooms: 1,
        bathrooms: 1,
        floor: 2,
        pets: false,
        images: [],
        description: "Pending listing description",
        extras: [],
        authorId: "listing-author",
        authorName: "Listing Author",
        updatedAt: now + 1,
      });
      return { jobId, listingId };
    });

    authState.actor.role = "admin";
    const queue = await t.query(api.publicationModeration.listPending, {});
    expect(queue.map((item) => item.title)).toEqual([
      "Pending listing",
      "Pending job",
    ]);
    await expect(
      t.query(api.publicationModeration.getPendingCount, {}),
    ).resolves.toBe(2);

    await t.mutation(api.publicationModeration.decide, {
      resource: { type: "job", id: jobId },
      decision: "approved",
    });
    await t.mutation(api.publicationModeration.decide, {
      resource: { type: "listing", id: listingId },
      decision: "rejected",
    });
    await expect(
      t.query(api.publicationModeration.getPendingCount, {}),
    ).resolves.toBe(0);

    await t.run(async (ctx) => {
      expect((await ctx.db.get(jobId))?.status).toBe("active");
      expect((await ctx.db.get(listingId))?.status).toBe("rejected");
      const notifications = await ctx.db.query("notifications").collect();
      const jobNotification = notifications.find(
        (notification) => notification.userId === "job-author",
      );
      const listingNotification = notifications.find(
        (notification) => notification.userId === "listing-author",
      );
      expect(jobNotification).toMatchObject({
        type: "job_approved",
        targetHref: "/jobs/pending-job",
      });
      expect(listingNotification).toMatchObject({
        type: "listing_rejected",
        targetHref: "/listing/pending-listing",
      });
    });
  });

  it("sends approved content back to moderation after an author edit", async () => {
    const jobId = await t.mutation(api.jobs.mutations.createJob, {
      title: "Approved job",
      type: "job",
      contractType: "CDI",
      workTime: "fullTime",
      city: "",
      workMode: "remote",
      company: "Member company",
      description: "An approved job before its author edits it.",
      contactEmail: "jobs@example.com",
    });
    const listingId = await t.mutation(
      api.listings.mutations.createListing,
      {
        title: "Approved listing",
        propertyType: "studio",
        listingMode: "rent",
        acceptsRentalFile: true,
        city: "Berlin",
        price: 900,
        area: 30,
        bedrooms: 1,
        bathrooms: 1,
        floor: 2,
        pets: false,
        images: [],
        description: "An approved listing before its author edits it.",
        extras: [],
        availableFrom: 1_800_000_000_000,
        contact: { email: "owner@example.com" },
      },
    );

    authState.actor.role = "admin";
    await t.mutation(api.publicationModeration.decide, {
      resource: { type: "job", id: jobId },
      decision: "approved",
    });
    await t.mutation(api.publicationModeration.decide, {
      resource: { type: "listing", id: listingId },
      decision: "approved",
    });

    authState.actor.role = "user";
    await t.mutation(api.jobs.mutations.updateJob, {
      id: jobId,
      title: "Edited job",
      type: "job",
      contractType: "CDI",
      workTime: "fullTime",
      city: "",
      workMode: "remote",
      company: "Member company",
      description: "The author edited this approved job.",
      contactEmail: "jobs@example.com",
    });
    await t.mutation(api.listings.mutations.updateListing, {
      listingId,
      patch: { title: "Edited listing" },
    });

    await t.run(async (ctx) => {
      expect((await ctx.db.get(jobId))?.status).toBe("pending");
      expect((await ctx.db.get(listingId))?.status).toBe("pending");
    });
    expect(notifyAdministratorsOfPendingPublication).toHaveBeenCalledTimes(4);
  });
});
