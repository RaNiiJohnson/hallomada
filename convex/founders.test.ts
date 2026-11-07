/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { MAX_FOUNDERS } from "./foundersValues";
import schema from "./schema";
import { modules } from "./test.setup";

vi.mock("./aggregates", async () => {
  const { aggregatesMock } = await import("./test.aggregates.mock");
  return aggregatesMock;
});

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

function actAs(id: string, role: "user" | "admin" = "user") {
  authState.actor._id = id;
  authState.actor.id = id;
  authState.actor.role = role;
}

async function insertPendingJob(
  t: ReturnType<typeof convexTest>,
  authorId: string,
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("JobOffer", {
      title: "Pending job",
      type: "job",
      slug: `pending-job-${authorId}`,
      contractType: "CDI",
      workTime: "fullTime",
      city: "Berlin",
      workMode: "onSite",
      company: "Example",
      description: "Pending description",
      authorId,
      authorName: "Author",
      status: "pending",
      updatedAt: Date.now(),
    }),
  );
}

async function approveJob(t: ReturnType<typeof convexTest>, authorId: string) {
  const jobId = await insertPendingJob(t, authorId);
  actAs("admin-1", "admin");
  await t.mutation(api.publicationModeration.decide, {
    resource: { type: "job", id: jobId },
    decision: "approved",
  });
}

describe("founder badge", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    actAs("member-1");
    t = convexTest(schema, modules);
  });

  const founder = (userId: string) => t.query(api.founders.getFounder, { userId });

  it("is granted, numbered, when a job offer is approved, not while pending", async () => {
    await insertPendingJob(t, "job-author");
    await expect(founder("job-author")).resolves.toBeNull();

    await approveJob(t, "job-author");
    await approveJob(t, "second-author");
    await expect(founder("job-author")).resolves.toEqual({ number: 1 });
    await expect(founder("second-author")).resolves.toEqual({ number: 2 });
  });

  it("is not granted when the publication is rejected", async () => {
    const jobId = await insertPendingJob(t, "job-author");
    actAs("admin-1", "admin");
    await t.mutation(api.publicationModeration.decide, {
      resource: { type: "job", id: jobId },
      decision: "rejected",
    });
    await expect(founder("job-author")).resolves.toBeNull();
  });

  it("no longer counts community posts", async () => {
    await t.mutation(api.posts.mutations.createPost, {
      title: "Bonjour",
      content: "Premier post",
    });
    await expect(founder("member-1")).resolves.toBeNull();
  });

  it("stops at the first MAX_FOUNDERS members", async () => {
    await t.run(async (ctx) => {
      for (let i = 1; i <= MAX_FOUNDERS; i++) {
        await ctx.db.insert("founders", {
          userId: `early-${i}`,
          since: i,
          number: i,
          source: "auto",
        });
      }
    });
    await approveJob(t, "late-author");
    await expect(founder("late-author")).resolves.toBeNull();
  });

  it("is no longer granted once the program is closed", async () => {
    actAs("admin-1", "admin");
    await t.mutation(api.founders.setProgramClosesAt, {
      closesAt: Date.now() - 1000,
    });
    await approveJob(t, "late-author");
    await expect(founder("late-author")).resolves.toBeNull();
  });

  it("can be granted and removed by an administrator only", async () => {
    await expect(
      t.mutation(api.founders.grantFounder, { userId: "member-2" }),
    ).rejects.toThrow();

    actAs("admin-1", "admin");
    await t.mutation(api.founders.grantFounder, { userId: "member-2" });
    await expect(founder("member-2")).resolves.toEqual({ number: 1 });
    await t.mutation(api.founders.revokeFounder, { userId: "member-2" });
    await expect(founder("member-2")).resolves.toBeNull();
  });

  it("recomputes the badges with the new rules, keeping manual grants", async () => {
    await t.run(async (ctx) => {
      // Old rule: a community post was enough.
      await ctx.db.insert("founders", { userId: "poster", since: 1 });
      await ctx.db.insert("founders", {
        userId: "chosen",
        since: 2,
        number: 1,
        source: "manual",
      });
      const job = (authorId: string, listedAt: number, status: "active" | "pending") =>
        ctx.db.insert("JobOffer", {
          title: authorId,
          type: "job",
          slug: authorId,
          contractType: "CDI",
          workTime: "fullTime",
          city: "Berlin",
          workMode: "onSite",
          company: "Example",
          description: "Description",
          authorId,
          status,
          updatedAt: listedAt,
          listedAt,
        });
      await job("later", 3_000, "active");
      await job("earlier", 1_000, "active");
      await job("waiting", 500, "pending");
    });

    const result = await t.mutation(internal.founders.rebuildFounders, {});
    expect(result).toEqual({ founders: 3, manual: 1 });
    await expect(founder("poster")).resolves.toBeNull();
    await expect(founder("waiting")).resolves.toBeNull();
    await expect(founder("chosen")).resolves.toEqual({ number: 1 });
    await expect(founder("earlier")).resolves.toEqual({ number: 2 });
    await expect(founder("later")).resolves.toEqual({ number: 3 });
  });
});
