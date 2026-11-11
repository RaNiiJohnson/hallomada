import { v } from "convex/values";
import { authMutation } from "../../functions";

export const likePost = authMutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    const existing = await ctx.db
      .query("postLikes")
      .withIndex("by_postId_and_userId", (q) =>
        q.eq("postId", args.postId).eq("userId", user._id),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);

      // Sync likesCount & aggregate
      const oldPost = (await ctx.db.get(args.postId))!;
      const newCount = Math.max(0, (oldPost.likesCount ?? 1) - 1);
      await ctx.db.patch(args.postId, { likesCount: newCount });
      // Remove ghost notification if exists
      if (post.authorId !== user._id) {
        const ghostNotifs = await ctx.db
          .query("notifications")
          .withIndex("by_userId", (q) => q.eq("userId", post.authorId))
          .filter((q) =>
            q.and(
              q.eq(q.field("type"), "new_like"),
              q.eq(q.field("fromUserName"), user.name),
              q.eq(q.field("postSlug"), post.slug),
            ),
          )
          .take(1);
        for (const notif of ghostNotifs) await ctx.db.delete(notif._id);
      }

      // await posthog.capture(ctx, {
      //   distinctId: posthogDistinctId(user._id),
      //   event: "post_unliked",
      //   properties: { post_id: args.postId, post_slug: post.slug },
      // });

      return;
    }

    await ctx.db.insert("postLikes", {
      postId: args.postId,
      userId: user._id,
    });
    // Sync likesCount & aggregate
    const oldPost = (await ctx.db.get(args.postId))!;
    const newCount = (oldPost.likesCount ?? 0) + 1;
    await ctx.db.patch(args.postId, { likesCount: newCount });

    // Notification
    if (post.authorId !== user._id) {
      const community = post.communityId
        ? await ctx.db.get(post.communityId)
        : null;
      await ctx.db.insert("notifications", {
        userId: post.authorId,
        type: "new_like",
        read: false,
        fromUserName: user.name,
        postSlug: post.slug,
        communitySlug: community?.slug,
        message: `${user.name} a checké votre post "${post.title}"`,
      });
    }

    // await posthog.capture(ctx, {
    //   distinctId: posthogDistinctId(user._id),
    //   event: "post_liked",
    //   properties: { post_id: args.postId, post_slug: post.slug },
    // });
  },
});

export const likeComment = authMutation({
  args: { commentId: v.id("postComments") },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    const existing = await ctx.db
      .query("postCommentLikes")
      .withIndex("by_commentId_and_userId", (q) =>
        q.eq("commentId", args.commentId).eq("userId", user._id),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      // Remove ghost notification if exists
      if (comment.authorId !== user._id) {
        const post = await ctx.db.get(comment.postId);
        const ghostNotifs = await ctx.db
          .query("notifications")
          .withIndex("by_userId", (q) => q.eq("userId", comment.authorId))
          .filter((q) =>
            q.and(
              q.eq(q.field("type"), "new_comment_like"),
              q.eq(q.field("fromUserName"), user.name),
              q.eq(q.field("postSlug"), post?.slug),
            ),
          )
          .take(1);
        for (const notif of ghostNotifs) await ctx.db.delete(notif._id);
      }

      return;
    }

    await ctx.db.insert("postCommentLikes", {
      commentId: args.commentId,
      userId: user._id,
    });

    // Notification
    if (comment.authorId !== user._id) {
      const post = await ctx.db.get(comment.postId);
      const community = post?.communityId
        ? await ctx.db.get(post.communityId)
        : null;
      await ctx.db.insert("notifications", {
        userId: comment.authorId,
        type: "new_comment_like",
        read: false,
        fromUserName: user.name,
        postSlug: post?.slug,
        communitySlug: community?.slug,
        message: `${user.name} a checké votre commentaire`,
      });
    }
  },
});

export const likeReply = authMutation({
  args: { replyId: v.id("postCommentReplies") },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new Error("Reply not found");

    const existing = await ctx.db
      .query("postCommentReplyLikes")
      .withIndex("by_replyId_and_userId", (q) =>
        q.eq("replyId", args.replyId).eq("userId", user._id),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      // Remove ghost notification if exists
      if (reply.authorId !== user._id) {
        const comment = await ctx.db.get(reply.commentId);
        const post = comment ? await ctx.db.get(comment.postId) : null;
        const ghostNotifs = await ctx.db
          .query("notifications")
          .withIndex("by_userId", (q) => q.eq("userId", reply.authorId))
          .filter((q) =>
            q.and(
              q.eq(q.field("type"), "new_reply_like"),
              q.eq(q.field("fromUserName"), user.name),
              q.eq(q.field("postSlug"), post?.slug),
            ),
          )
          .take(1);
        for (const notif of ghostNotifs) await ctx.db.delete(notif._id);
      }

      return;
    }

    await ctx.db.insert("postCommentReplyLikes", {
      replyId: args.replyId,
      userId: user._id,
    });

    // Notification
    if (reply.authorId !== user._id) {
      const comment = await ctx.db.get(reply.commentId);
      const post = comment ? await ctx.db.get(comment.postId) : null;
      const community = post?.communityId
        ? await ctx.db.get(post.communityId)
        : null;
      await ctx.db.insert("notifications", {
        userId: reply.authorId,
        type: "new_reply_like",
        read: false,
        fromUserName: user.name,
        postSlug: post?.slug,
        communitySlug: community?.slug,
        message: `${user.name} a checké votre réponse`,
      });
    }
  },
});
