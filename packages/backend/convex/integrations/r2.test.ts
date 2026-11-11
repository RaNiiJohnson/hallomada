/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
        cv: null,
      },
    }),
    authComponent: {
      ...actual.authComponent,
      safeGetAuthUser: vi.fn().mockResolvedValue({
        _id: "testUserId",
        name: "Test User",
        cv: null,
      }),
    },
  };
});

vi.mock("../rateLimits", () => ({
  limiter: {
    limit: vi.fn().mockResolvedValue({ ok: false, retryAfter: 30_000 }),
  },
}));

vi.mock("../aggregates", async () => {
  const { aggregatesMock } = await import("../test.aggregates.mock");
  return aggregatesMock;
});

describe("R2 upload security", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("rejects MIME types outside the server allowlist", async () => {
    await expect(
      t.mutation(
        api.integrations.r2.generateCvUploadUrl,
        { contentType: "text/html" } as never,
      ),
    ).rejects.toThrow();
  });

  it("rate limits upload URL generation before signing a URL", async () => {
    await expect(
      t.mutation(api.integrations.r2.generateCvUploadUrl, {
        contentType: "application/pdf",
      }),
    ).rejects.toThrow("Too many upload requests");
  });

  it("rejects a verified key owned by another user", async () => {
    await t.run(async (ctx) => {
      await ctx.db.insert("uploadGrants", {
        key: "cv/other-user.pdf",
        userId: "otherUserId",
        kind: "cv",
        expectedContentType: "application/pdf",
        maxSize: 5 * 1024 * 1024,
        verified: true,
      });
    });

    await expect(
      t.mutation(api.integrations.r2.uploadCvAndDeleteOld, {
        newCvKey: "cv/other-user.pdf",
      }),
    ).rejects.toThrow("Upload key is not verified for the current user");
  });

  it("rejects a verified image key created for the wrong profile image kind", async () => {
    await t.run(async (ctx) => {
      await ctx.db.insert("uploadGrants", {
        key: "cover/image.png",
        userId: "testUserId",
        kind: "cover",
        expectedContentType: "image/png",
        maxSize: 5 * 1024 * 1024,
        verified: true,
      });
    });

    await expect(
      t.mutation(api.integrations.r2.replaceProfileImage, {
        key: "cover/image.png",
        imageType: "profile",
      }),
    ).rejects.toThrow("Upload key is not verified for the current user");
  });
});
