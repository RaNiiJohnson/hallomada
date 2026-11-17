/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";

const authState = vi.hoisted(() => ({
  authenticated: true,
  verified: true,
  actor: {
    _id: "reporter-1",
    name: "Reporter One",
    role: "user" as "user" | "admin",
  },
}));

const rateState = vi.hoisted(() => ({
  ok: true,
  retryAfter: 0,
}));

vi.mock("./auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auth/auth")>();
  const requireVerifiedUser = async () => {
    if (!authState.authenticated) throw new Error("Unauthorized");
    if (!authState.verified) throw new Error("Email verification required");
    return { user: authState.actor };
  };

  return {
    ...actual,
    requireAuth: vi.fn(requireVerifiedUser),
    requireAdmin: vi.fn(async () => {
      const result = await requireVerifiedUser();
      if (result.user.role !== "admin") throw new Error("Admin access required");
      return result;
    }),
  };
});

vi.mock("./rateLimits", () => ({
  limiter: {
    limit: vi.fn(async () => ({
      ok: rateState.ok,
      retryAfter: rateState.retryAfter,
    })),
  },
}));

describe("reports", () => {
  let t: ReturnType<typeof convexTest>;
  let postId: Id<"posts">;

  beforeEach(async () => {
    authState.authenticated = true;
    authState.verified = true;
    authState.actor._id = "reporter-1";
    authState.actor.name = "Reporter One";
    authState.actor.role = "user";
    rateState.ok = true;
    rateState.retryAfter = 0;
    t = convexTest(schema, modules);
    postId = await t.run(async (ctx) => {
      return await ctx.db.insert("posts", {
        slug: "unsafe-post",
        title: "Unsafe post",
        scope: "public",
        content: "Suspicious content",
        authorId: "author-1",
        authorName: "Author One",
        updatedAt: 1,
      });
    });
  });

  it("creates a traceable report for an existing target", async () => {
    const reportId = await t.mutation(api.reports.create, {
      target: { type: "post", id: postId },
      reason: "fraud",
      details: "  The external claims are false.  ",
    });

    const report = await t.run(async (ctx) => await ctx.db.get(reportId));
    expect(report).toMatchObject({
      reporterId: "reporter-1",
      reporterName: "Reporter One",
      targetType: "post",
      targetId: postId,
      targetLabel: "Unsafe post",
      targetHref: "/posts/unsafe-post",
      reason: "fraud",
      details: "The external claims are false.",
      status: "new",
    });
    expect(report?.reportedAt).toEqual(expect.any(Number));
  });

  it("blocks duplicate reports, self-reports and missing targets", async () => {
    await t.mutation(api.reports.create, {
      target: { type: "post", id: postId },
      reason: "spam",
    });
    await expect(
      t.mutation(api.reports.create, {
        target: { type: "post", id: postId },
        reason: "other",
      }),
    ).rejects.toThrow("already reported");

    authState.actor._id = "author-1";
    await expect(
      t.mutation(api.reports.create, {
        target: { type: "post", id: postId },
        reason: "spam",
      }),
    ).rejects.toThrow("your own content");

    authState.actor._id = "reporter-2";
    const missingPostId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("posts", {
        slug: "deleted-post",
        title: "Deleted post",
        scope: "public",
        content: "Deleted content",
        authorId: "author-2",
        updatedAt: 1,
      });
      await ctx.db.delete(id);
      return id;
    });
    await expect(
      t.mutation(api.reports.create, {
        target: { type: "post", id: missingPostId },
        reason: "spam",
      }),
    ).rejects.toThrow("not found");
  });

  it("requires a verified member and enforces the server rate limit", async () => {
    authState.authenticated = false;
    await expect(
      t.mutation(api.reports.create, {
        target: { type: "post", id: postId },
        reason: "spam",
      }),
    ).rejects.toThrow("Unauthorized");

    authState.authenticated = true;
    authState.verified = false;
    await expect(
      t.mutation(api.reports.create, {
        target: { type: "post", id: postId },
        reason: "spam",
      }),
    ).rejects.toThrow("Email verification required");

    authState.verified = true;
    rateState.ok = false;
    rateState.retryAfter = 60_000;
    await expect(
      t.mutation(api.reports.create, {
        target: { type: "post", id: postId },
        reason: "spam",
      }),
    ).rejects.toThrow("Daily report limit reached");
  });

  it("allows only an administrator to read and handle the queue", async () => {
    const reportId = await t.mutation(api.reports.create, {
      target: { type: "post", id: postId },
      reason: "dangerous",
    });

    await expect(
      t.query(api.reports.list, {
        paginationOpts: { cursor: null, numItems: 20 },
        status: "new",
      }),
    ).rejects.toThrow("Admin access required");
    await expect(
      t.mutation(api.reports.markHandled, { reportId }),
    ).rejects.toThrow("Admin access required");

    authState.actor._id = "admin-1";
    authState.actor.name = "Admin One";
    authState.actor.role = "admin";

    const queue = await t.query(api.reports.list, {
      paginationOpts: { cursor: null, numItems: 20 },
      status: "new",
    });
    expect(queue.page).toHaveLength(1);
    expect(queue.page[0]?._id).toBe(reportId);

    await t.mutation(api.reports.markHandled, { reportId });
    const report = await t.run(async (ctx) => await ctx.db.get(reportId));
    expect(report).toMatchObject({
      status: "handled",
      handledById: "admin-1",
      handledByName: "Admin One",
    });
    expect(report?.handledAt).toEqual(expect.any(Number));

    const remaining = await t.query(api.reports.list, {
      paginationOpts: { cursor: null, numItems: 20 },
      status: "new",
    });
    expect(remaining.page).toHaveLength(0);
  });
});
