import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalMutation } from "../_generated/server";
import { assertEmailVerified, authComponent } from "../auth/auth";
import { runCascadeDelete } from "../cascadeDeletes";

export const _verifyDeleteAuth = internalMutation({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    assertEmailVerified(user);

    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Post not found");
    if (post.authorId !== user._id) throw new Error("Not authorized");

    return { postId: post._id, slug: post.slug };
  },
});

export const deletePost = action({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    // 1. Verify auth and get slug
    const { slug } = await ctx.runMutation(
      internal.posts.actions._verifyDeleteAuth,
      {
        id: args.postId,
      },
    );

    // 2. Clean up notifications for this post
    await ctx.runMutation(internal.notifications.mutations.deleteByPost, {
      slug,
    });

    // Property db does not exist on type
    //
    // const translations = await ctx.db
    //   .query("postTranslations")
    //   .withIndex("by_post", (q) => q.eq("postId", args.postId))
    //   .collect();
    // await Promise.all(translations.map((t) => ctx.db.delete(t._id)));

    // 3. Cascade delete
    const counts = await runCascadeDelete(ctx, "posts", args.postId);

    return counts;
  },
});
