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

describe("Bookmarks", () => {
  let t: ReturnType<typeof convexTest>;
  let postId: Id<"posts">;

  beforeEach(async () => {
    t = convexTest(schema, modules);

    const communityResult = await t.mutation(
      api.communities.mutations.createCommunity,
      {
        name: "Bookmark Community",
        theme: "Testing",
        description: "Description",
        privacy: "public",
      },
    );

    postId = (await t.mutation(api.posts.mutations.createPost, {
      title: "Test Post",
      content: "Test Content",
      communityId: communityResult.comId,
    })) as Id<"posts">;
  });

  it("should toggle a bookmark", async () => {
    const result1 = await t.mutation(api.bookmarks.mutations.toggleBookmark, {
      resourceId: postId,
      resourceType: "post",
    });
    expect(result1.bookmarked).toBe(true);

    const result2 = await t.mutation(api.bookmarks.mutations.toggleBookmark, {
      resourceId: postId,
      resourceType: "post",
    });
    expect(result2.bookmarked).toBe(false);
  });

  it("refuses a resource id whose table does not match its type", async () => {
    await expect(
      t.mutation(api.bookmarks.mutations.toggleBookmark, {
        resourceId: postId,
        resourceType: "job",
      }),
    ).rejects.toThrow("Resource type and identifier do not match");
  });

  it("refuses a resource that no longer exists", async () => {
    await t.run(async (ctx) => await ctx.db.delete(postId));

    await expect(
      t.mutation(api.bookmarks.mutations.toggleBookmark, {
        resourceId: postId,
        resourceType: "post",
      }),
    ).rejects.toThrow("Bookmark resource not found");
  });

  it("removes every legacy duplicate and preserves logical uniqueness", async () => {
    await t.run(async (ctx) => {
      await ctx.db.insert("bookmarks", {
        userId: "testUserId",
        resourceId: postId,
        resourceType: "post",
      });
      await ctx.db.insert("bookmarks", {
        userId: "testUserId",
        resourceId: postId,
        resourceType: "post",
      });
    });

    const removed = await t.mutation(
      api.bookmarks.mutations.toggleBookmark,
      { resourceId: postId, resourceType: "post" },
    );
    expect(removed.bookmarked).toBe(false);

    const afterRemoval = await t.query(
      api.bookmarks.queries.getMyBookmarks,
      { paginationOpts: { cursor: null, numItems: 10 } },
    );
    expect(afterRemoval.page).toHaveLength(0);

    await t.mutation(api.bookmarks.mutations.toggleBookmark, {
      resourceId: postId,
      resourceType: "post",
    });
    const afterInsert = await t.query(
      api.bookmarks.queries.getMyBookmarks,
      { paginationOpts: { cursor: null, numItems: 10 } },
    );
    expect(afterInsert.page).toHaveLength(1);
    expect(afterInsert.page[0]?.snapshot).toMatchObject({
      title: "Test Post",
      href: expect.stringContaining("/communities/"),
    });
  });

  it("paginates private bookmarks without resolving every resource", async () => {
    await t.run(async (ctx) => {
      for (let index = 0; index < 105; index += 1) {
        await ctx.db.insert("bookmarks", {
          userId: "testUserId",
          resourceId: postId,
          resourceType: "post",
        });
      }
    });

    const bookmarks = await t.query(api.bookmarks.queries.getMyBookmarks, {
      paginationOpts: { cursor: null, numItems: 20 },
    });
    expect(bookmarks.page).toHaveLength(20);
    expect(bookmarks.isDone).toBe(false);
  });

  it("repairs and opens an existing legacy bookmark for its owner", async () => {
    const bookmarkId = await t.run(async (ctx) =>
      ctx.db.insert("bookmarks", {
        userId: "testUserId",
        resourceId: postId,
        resourceType: "post",
      }),
    );

    const snapshot = await t.mutation(
      api.bookmarks.mutations.resolveLegacyBookmark,
      { bookmarkId },
    );

    expect(snapshot).toMatchObject({
      title: "Test Post",
      href: expect.stringContaining("/communities/"),
    });
    const repaired = await t.run((ctx) => ctx.db.get(bookmarkId));
    expect(repaired?.snapshot).toEqual(snapshot);
  });
});
