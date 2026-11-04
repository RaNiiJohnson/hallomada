import { v } from "convex/values";
import { generatedSlug } from "../../src/lib/utils";
import { authMutation } from "../functions";
import { limiter } from "../rateLimits";

export const createPost = authMutation({
  args: {
    content: v.string(),
    title: v.string(),
    communityId: v.optional(v.id("communities")),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const userId = user._id;

    const community = args.communityId
      ? await ctx.db.get(args.communityId)
      : null;
    if (args.communityId && !community) throw new Error("Community not found");

    if (args.communityId) {
      const membership = await ctx.db
        .query("communityMembers")
        .withIndex("by_userId_and_communityId", (q) =>
          q.eq("userId", userId).eq("communityId", args.communityId!),
        )
        .unique();
      if (!membership) throw new Error("You must be a community member to post");
    }

    const { ok, retryAfter } = await limiter.limit(ctx, "createPostPerUser", {
      key: userId,
    });
    if (!ok) {
      return { retryAfter };
    }

    const postId = await ctx.db.insert("posts", {
      slug: generatedSlug(args.title),
      authorId: user._id,
      content: args.content,
      title: args.title,
      authorName: user.name,
      scope: community ? "community" : "public",
      communityId: community?._id,
      communityName: community?.name,
      communitySlug: community?.slug,
      searchAll: `${args.title} ${args.content} ${user.name}${community ? ` ${community.name}` : ""}`,
      updatedAt: Date.now(),
    });

    // await posthog.capture(ctx, {
    //   distinctId: posthogDistinctId(userId),
    //   event: "post_created",
    //   properties: {
    //     post_id: postId,
    //     community_id: args.communityId,
    //     community_slug: community.slug,
    //   },
    // });

    return postId;
  },
});

export const updatePost = authMutation({
  args: {
    postId: v.id("posts"),
    content: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.authorId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.postId, {
      content: args.content,
      title: args.title,
      searchAll: `${args.title} ${args.content} ${user.name}`,
      updatedAt: Date.now(),
    });
  },
});
