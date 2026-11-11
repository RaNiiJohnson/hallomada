import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { authMutation, internalMutation } from "../../functions";
import { limiter } from "../../rateLimits";
import { throwLimitReached } from "../../utils/errors";
import { assertMessageContent, MAX_LENGTH } from "../../utils/limits";

async function consumeCommentRate(
  ctx: Parameters<typeof limiter.limit>[0],
  userId: string,
) {
  const rate = await limiter.limit(ctx, "commentPerUser", { key: userId });
  if (!rate.ok) {
    throwLimitReached("Comment rate limit reached", {
      retryAfter: rate.retryAfter ?? 0,
    });
  }
}

const LIKE_BATCH = 100;
const REPLY_BATCH = 20;

/**
 * Deletes one bounded batch of a comment's replies and likes. Returns true when
 * more remain, so the caller can schedule a continuation instead of reading an
 * unbounded number of documents in a single transaction.
 */
async function purgeCommentChildren(
  ctx: MutationCtx,
  commentId: Id<"postComments">,
): Promise<boolean> {
  const likes = await ctx.db
    .query("postCommentLikes")
    .withIndex("by_commentId", (q) => q.eq("commentId", commentId))
    .take(LIKE_BATCH);
  for (const like of likes) await ctx.db.delete(like._id);
  if (likes.length === LIKE_BATCH) return true;

  const replies = await ctx.db
    .query("postCommentReplies")
    .withIndex("by_commentId", (q) => q.eq("commentId", commentId))
    .take(REPLY_BATCH);
  for (const reply of replies) {
    if (await purgeReplyLikes(ctx, reply._id)) return true;
    await ctx.db.delete(reply._id);
  }
  return replies.length === REPLY_BATCH;
}

/** Deletes one batch of a reply's likes. Returns true when more remain. */
async function purgeReplyLikes(
  ctx: MutationCtx,
  replyId: Id<"postCommentReplies">,
): Promise<boolean> {
  const likes = await ctx.db
    .query("postCommentReplyLikes")
    .withIndex("by_replyId", (q) => q.eq("replyId", replyId))
    .take(LIKE_BATCH);
  for (const like of likes) await ctx.db.delete(like._id);
  return likes.length === LIKE_BATCH;
}

export const continueCommentCleanup = internalMutation({
  args: { commentId: v.id("postComments") },
  returns: v.null(),
  handler: async (ctx, { commentId }) => {
    if (await purgeCommentChildren(ctx, commentId)) {
      await ctx.scheduler.runAfter(
        0,
        internal.posts.comments.mutations.continueCommentCleanup,
        { commentId },
      );
    }
    return null;
  },
});

export const continueReplyCleanup = internalMutation({
  args: { replyId: v.id("postCommentReplies") },
  returns: v.null(),
  handler: async (ctx, { replyId }) => {
    if (await purgeReplyLikes(ctx, replyId)) {
      await ctx.scheduler.runAfter(
        0,
        internal.posts.comments.mutations.continueReplyCleanup,
        { replyId },
      );
    }
    return null;
  },
});

export const addComment = authMutation({
  args: {
    postId: v.id("posts"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    assertMessageContent("Comment", args.content, MAX_LENGTH.comment);
    await consumeCommentRate(ctx, user._id);

    const commentId = await ctx.db.insert("postComments", {
      postId: args.postId,
      authorId: user._id,
      content: args.content,
      authorName: user.name,
    });

    if (post.authorId !== user._id) {
      const community = post.communityId
        ? await ctx.db.get(post.communityId)
        : null;
      await ctx.db.insert("notifications", {
        userId: post.authorId,
        type: "new_comment",
        read: false,
        fromUserName: user.name,
        postSlug: post.slug,
        communitySlug: community?.slug,
        message: `${user.name} a commenté votre post "${post.title}"`,
      });
    }

    // await posthog.capture(ctx, {
    //   distinctId: posthogDistinctId(user._id),
    //   event: "comment_created",
    //   properties: {
    //     comment_id: commentId,
    //     post_id: args.postId,
    //     post_slug: post.slug,
    //   },
    // });

    return commentId;
  },
});

export const deleteComment = authMutation({
  args: { commentId: v.id("postComments") },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.authorId !== user._id) throw new Error("Not authorized");

    // Children are purged in bounded batches; leftovers are cleaned up by a
    // scheduled continuation (orphans are unreachable from the UI meanwhile).
    if (await purgeCommentChildren(ctx, args.commentId)) {
      await ctx.scheduler.runAfter(
        0,
        internal.posts.comments.mutations.continueCommentCleanup,
        { commentId: args.commentId },
      );
    }

    // Remove ghost notification if exists
    const post = await ctx.db.get(comment.postId);
    if (post && post.authorId !== user._id) {
      const ghostNotifs = await ctx.db
        .query("notifications")
        .withIndex("by_userId", (q) => q.eq("userId", post.authorId))
        .filter((q) =>
          q.and(
            q.eq(q.field("type"), "new_comment"),
            q.eq(q.field("fromUserName"), user.name),
            q.eq(q.field("postSlug"), post.slug),
          ),
        )
        .take(1);
      for (const notif of ghostNotifs) await ctx.db.delete(notif._id);
    }

    await ctx.db.delete(args.commentId);
  },
});

export const updateComment = authMutation({
  args: {
    commentId: v.id("postComments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.authorId !== user._id) throw new Error("Not authorized");

    assertMessageContent("Comment", args.content, MAX_LENGTH.comment);
    await ctx.db.patch(args.commentId, { content: args.content });
  },
});

export const addReply = authMutation({
  args: {
    commentId: v.id("postComments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    assertMessageContent("Reply", args.content, MAX_LENGTH.comment);
    await consumeCommentRate(ctx, user._id);

    const replyId = await ctx.db.insert("postCommentReplies", {
      commentId: args.commentId,
      authorId: user._id,
      authorName: user.name,
      content: args.content,
    });

    // Notification — pas se notifier soi-même
    if (comment.authorId !== user._id) {
      const post = await ctx.db.get(comment.postId);
      const community = post?.communityId
        ? await ctx.db.get(post.communityId)
        : null;
      await ctx.db.insert("notifications", {
        userId: comment.authorId,
        type: "new_reply",
        read: false,
        fromUserName: user.name,
        postSlug: post?.slug,
        communitySlug: community?.slug,
        message: `${user.name} a répondu à votre commentaire`,
      });
    }

    // await posthog.capture(ctx, {
    //   distinctId: posthogDistinctId(user._id),
    //   event: "reply_created",
    //   properties: {
    //     reply_id: replyId,
    //     comment_id: args.commentId,
    //   },
    // });

    return replyId;
  },
});

export const updateReply = authMutation({
  args: {
    replyId: v.id("postCommentReplies"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new Error("Reply not found");
    if (reply.authorId !== user._id) throw new Error("Not authorized");

    assertMessageContent("Reply", args.content, MAX_LENGTH.comment);
    await ctx.db.patch(args.replyId, { content: args.content });
  },
});

export const deleteReply = authMutation({
  args: { replyId: v.id("postCommentReplies") },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new Error("Reply not found");
    if (reply.authorId !== user._id) throw new Error("Not authorized");

    if (await purgeReplyLikes(ctx, args.replyId)) {
      await ctx.scheduler.runAfter(
        0,
        internal.posts.comments.mutations.continueReplyCleanup,
        { replyId: args.replyId },
      );
    }

    // Remove ghost notification if exists
    const comment = await ctx.db.get(reply.commentId);
    if (comment && comment.authorId !== user._id) {
      const post = await ctx.db.get(comment.postId);
      const ghostNotifs = await ctx.db
        .query("notifications")
        .withIndex("by_userId", (q) => q.eq("userId", comment.authorId))
        .filter((q) =>
          q.and(
            q.eq(q.field("type"), "new_reply"),
            q.eq(q.field("fromUserName"), user.name),
            q.eq(q.field("postSlug"), post?.slug),
          ),
        )
        .take(1);
      for (const notif of ghostNotifs) await ctx.db.delete(notif._id);
    }

    await ctx.db.delete(args.replyId);
  },
});
