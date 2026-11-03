/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
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

describe("founder badge", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    actAs("member-1");
    t = convexTest(schema, modules);
  });

  it("is granted when a job offer is approved, not while it is pending", async () => {
    const jobId = await insertPendingJob(t, "job-author");
    await expect(
      t.query(api.founders.isFounder, { userId: "job-author" }),
    ).resolves.toBe(false);

    actAs("admin-1", "admin");
    await t.mutation(api.publicationModeration.decide, {
      resource: { type: "job", id: jobId },
      decision: "approved",
    });

    await expect(
      t.query(api.founders.isFounder, { userId: "job-author" }),
    ).resolves.toBe(true);
  });

  it("is not granted when the publication is rejected", async () => {
    const jobId = await insertPendingJob(t, "job-author");
    actAs("admin-1", "admin");
    await t.mutation(api.publicationModeration.decide, {
      resource: { type: "job", id: jobId },
      decision: "rejected",
    });
    await expect(
      t.query(api.founders.isFounder, { userId: "job-author" }),
    ).resolves.toBe(false);
  });

  it("is granted on a member's first community post", async () => {
    await t.mutation(api.posts.mutations.createPost, {
      title: "Bonjour",
      content: "Premier post",
    });
    await expect(
      t.query(api.founders.isFounder, { userId: "member-1" }),
    ).resolves.toBe(true);
    await t.run(async (ctx) => {
      const rows = await ctx.db.query("founders").take(10);
      expect(rows).toHaveLength(1);
    });
  });

  it("is no longer granted once the program is closed", async () => {
    actAs("admin-1", "admin");
    await t.mutation(api.founders.setProgramClosesAt, {
      closesAt: Date.now() - 1000,
    });
    await expect(t.query(api.founders.getProgram, {})).resolves.toEqual({
      closesAt: expect.any(Number),
    });

    actAs("member-2");
    await t.mutation(api.posts.mutations.createPost, {
      title: "Trop tard",
      content: "Après la fermeture",
    });
    await expect(
      t.query(api.founders.isFounder, { userId: "member-2" }),
    ).resolves.toBe(false);
  });

  it("only lets administrators change the program", async () => {
    await expect(
      t.mutation(api.founders.setProgramClosesAt, { closesAt: null }),
    ).rejects.toThrow();
  });
});
