/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { modules } from "../../test.setup";

vi.mock("../../auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../auth/auth")>();
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

vi.mock("../../aggregates", async () => {
  const { aggregatesMock } = await import("../../test.aggregates.mock");
  return aggregatesMock;
});

describe("Comments", () => {
  let t: ReturnType<typeof convexTest>;
  let postId: Id<"posts">;

  beforeEach(async () => {
    t = convexTest(schema, modules);

    const communityResult = await t.mutation(
      api.communities.mutations.createCommunity,
      {
        name: "Comment Community",
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

  it("should add a comment", async () => {
    const commentId = await t.mutation(
      api.posts.comments.mutations.addComment,
      {
        postId,
        content: "First Comment",
      },
    );

    const comment = await t.run(async (ctx) => await ctx.db.get(commentId));
    expect(comment?.content).toBe("First Comment");
  });

  it("should update a comment", async () => {
    const commentId = await t.mutation(
      api.posts.comments.mutations.addComment,
      {
        postId,
        content: "First Comment",
      },
    );

    await t.mutation(api.posts.comments.mutations.updateComment, {
      commentId,
      content: "Updated Comment",
    });

    const comment = await t.run(async (ctx) => await ctx.db.get(commentId));
    expect(comment?.content).toBe("Updated Comment");
  });

  it("should delete a comment", async () => {
    const commentId = await t.mutation(
      api.posts.comments.mutations.addComment,
      {
        postId,
        content: "First Comment",
      },
    );

    await t.mutation(api.posts.comments.mutations.deleteComment, {
      commentId,
    });

    const comment = await t.run(async (ctx) => await ctx.db.get(commentId));
    expect(comment).toBeNull();
  });

  it("should update and delete a reply", async () => {
    const commentId = await t.mutation(
      api.posts.comments.mutations.addComment,
      {
        postId,
        content: "First Comment",
      },
    );
    const replyId = await t.mutation(api.posts.comments.mutations.addReply, {
      commentId,
      content: "First Reply",
    });

    await t.mutation(api.posts.comments.mutations.updateReply, {
      replyId,
      content: "Updated Reply",
    });
    expect((await t.run(async (ctx) => ctx.db.get(replyId)))?.content).toBe(
      "Updated Reply",
    );

    await t.mutation(api.posts.comments.mutations.deleteReply, { replyId });
    expect(await t.run(async (ctx) => ctx.db.get(replyId))).toBeNull();
  });
});
