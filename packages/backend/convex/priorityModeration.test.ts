/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

vi.mock("./aggregates", async () => {
  const { aggregatesMock } = await import("./test.aggregates.mock");
  return aggregatesMock;
});

// Once Premium is paid, only some members have it.
vi.mock("./premium", () => ({
  PREMIUM_OFFERED_TO_ALL: false,
  hasPremium: vi.fn(async (_ctx: unknown, userId: string) => userId === "premium-author"),
}));

vi.mock("./auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auth/auth")>();
  return {
    ...actual,
    requireAdmin: vi.fn(async () => ({
      user: { _id: "admin-1", id: "admin-1", name: "Admin", role: "admin" },
    })),
  };
});

describe("priority moderation", () => {
  it("puts Premium members' submissions first, newest first within each group", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const job = (title: string, authorId: string, updatedAt: number) =>
        ctx.db.insert("JobOffer", {
          title,
          type: "job",
          slug: title,
          contractType: "CDI",
          workTime: "fullTime",
          city: "Berlin",
          workMode: "onSite",
          company: "Example",
          description: "Description",
          authorId,
          authorName: authorId,
          status: "pending",
          updatedAt,
        });
      await job("free-new", "free-author", 3_000);
      await job("premium-old", "premium-author", 1_000);
      await job("premium-new", "premium-author", 2_000);
    });

    const queue = await t.query(api.publicationModeration.listPending, {});
    expect(queue.map((item) => [item.title, item.priority])).toEqual([
      ["premium-new", true],
      ["premium-old", true],
      ["free-new", false],
    ]);
  });
});
