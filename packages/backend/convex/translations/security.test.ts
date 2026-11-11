/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

vi.mock("../auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/auth")>();
  return {
    ...actual,
    requireAuth: vi.fn().mockResolvedValue({
      user: {
        _id: "testUserId",
        id: "testUserId",
        name: "Test User",
      },
    }),
  };
});

vi.mock("../rateLimits", () => ({
  limiter: {
    limit: vi.fn().mockResolvedValue({ ok: false, retryAfter: 15_000 }),
  },
}));

describe("translation action security", () => {
  it("rate limits an uncached paid translation before calling the provider", async () => {
    const t = convexTest(schema, modules);
    const jobId = await t.run(async (ctx) => {
      return await ctx.db.insert("JobOffer", {
        title: "Engineer",
        type: "job",
        slug: "engineer",
        contractType: "fullTime",
        city: "Berlin",
        duration: "Permanent",
        startDate: "2026-01-01",
        company: "Hallomada",
        description: "Build useful things",
        certificates: [],
        salary: 1,
        salaryPeriod: "year",
        authorId: "employer",
        updatedAt: 1,
      });
    });

    await expect(
      t.action(api.jobs.translate.translateJob, {
        jobId,
        targetLanguage: "de",
      }),
    ).rejects.toThrow("Translation rate limit exceeded");
  });
});
