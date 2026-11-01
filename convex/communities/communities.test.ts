/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import schema from "../schema";
import { modules } from "../test.setup";

vi.mock("../auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/auth")>();
  return {
    ...actual,
    requireAuth: vi.fn().mockResolvedValue({
      user: { _id: "testUserId", id: "testUserId", name: "Test User" },
    }),
    authComponent: {
      ...actual.authComponent,
      safeGetAuthUser: vi.fn().mockResolvedValue({
        _id: "testUserId",
        name: "Test User",
      }),
    },
  };
});

vi.mock("../aggregates", async () => {
  const { aggregatesMock } = await import("../test.aggregates.mock");
  return aggregatesMock;
});

describe("Communities", () => {
  let t: ReturnType<typeof convexTest>;
  let communityId: Id<"communities">;
  let communitySlug: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);

    const communityResult = await t.mutation(
      api.communities.mutations.createCommunity,
      {
        name: "Community Name",
        theme: "Testing",
        description: "Community Description",
        privacy: "public",
      },
    );

    communityId = communityResult.comId;
    communitySlug = communityResult.slug;
  });

  it("should have created a community", async () => {
    const result = await t.query(api.communities.queries.getCommunity, {
      slug: communitySlug,
    });
    expect(result?.name).toBe("Community Name");
  });

  it("should update a community", async () => {
    await t.mutation(api.communities.mutations.updateCommunity, {
      id: communityId,
      name: "Updated Community Name",
      description: "Updated Description",
      theme: "Testing",
      privacy: "public",
    });

    const result = await t.query(api.communities.queries.getCommunity, {
      slug: communitySlug,
    });
    expect(result?.name).toBe("Updated Community Name");
  });

  it("should delete a community", async () => {
    await t.action(api.communities.actions.deleteCommunity, {
      id: communityId,
    });

    const result = await t.query(api.communities.queries.getCommunity, {
      slug: communitySlug,
    });
    expect(result).toBeNull();
  });

  it("deletes community descendants recursively", async () => {
    const descendants = await t.run(async (ctx) => {
      const messageId = await ctx.db.insert("communityMessages", {
        communityId,
        authorId: "testUserId",
        content: "Message",
      });
      const postId = await ctx.db.insert("posts", {
        slug: "cascade-post",
        title: "Cascade post",
        content: "Content",
        communityId,
        scope: "community",
        authorId: "testUserId",
      });
      const bookmarkId = await ctx.db.insert("bookmarks", {
        userId: "testUserId",
        resourceId: postId,
        resourceType: "post",
      });
      const translationId = await ctx.db.insert("postTranslations", {
        postId,
        language: "de",
        title: "Titel",
        content: "Inhalt",
        sourceUpdatedAt: Date.now(),
      });
      return { messageId, postId, bookmarkId, translationId };
    });

    await t.action(api.communities.actions.deleteCommunity, {
      id: communityId,
    });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(communityId)).toBeNull();
      for (const id of Object.values(descendants)) {
        expect(await ctx.db.get(id)).toBeNull();
      }
    });
    expect(
      await t.query(api.communities.queries.getMyCommunities, {}),
    ).toHaveLength(0);
  });
});
