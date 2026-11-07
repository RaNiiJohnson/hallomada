import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
  communityMembersCount,
  communityPostsCount,
  postCommentsCount,
  postLikesCount,
} from "../aggregates";
import { authComponent } from "../auth/auth";
import { internalQuery, query } from "../functions";
import schema from "../schema";

export const isMember = query({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const member = await ctx.db
      .query("communityMembers")
      .withIndex("by_userId_and_communityId", (q) =>
        q.eq("userId", user._id).eq("communityId", args.communityId),
      )
      .unique();

    return member ?? null;
  },
});

export const getAllCommunities = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const communities = await ctx.db
      .query("communities")
      .order("desc")
      .paginate(args.paginationOpts);
    return communities;
  },
});

export const getTopCommunities = query({
  args: {},
  returns: v.array(schema.doc("communities")),
  handler: async (ctx) => {
    const communities = await ctx.db.query("communities").order("desc").take(3);

    return communities;
  },
});

export const getCommunitiesPreview = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    // Secret communities are never listed. Privacy values sort as
    // "private" < "public" < "secret", so this range keeps public and private
    // communities only: public ones first, newest first within each group.
    const result = await ctx.db
      .query("communities")
      .withIndex("by_privacy", (q) => q.lt("privacy", "secret"))
      .order("desc")
      .paginate(args.paginationOpts);

    const communitiesWithPreview = await Promise.all(
      result.page.map(async (community) => {
        const [membersCount, postsCount, canSeePosts] = await Promise.all([
          communityMembersCount.count(ctx, { namespace: community._id }),
          communityPostsCount.count(ctx, { namespace: community._id }),
          community.privacy === "public"
            ? Promise.resolve(true)
            : user
              ? ctx.db
                  .query("communityMembers")
                  .withIndex("by_userId_and_communityId", (q) =>
                    q.eq("userId", user._id).eq("communityId", community._id),
                  )
                  .unique()
                  .then((m) => !!m)
              : Promise.resolve(false),
        ]);

        // Posts of a private community are only previewed to its members.
        const recentPosts = canSeePosts
          ? await ctx.db
              .query("posts")
              .withIndex("by_communityId", (q) =>
                q.eq("communityId", community._id),
              )
              .order("desc")
              .take(3)
          : [];

        const recentPostsWithLikes = await Promise.all(
          recentPosts.map(async (post) => {
            const [likesCount, userHasLiked] = await Promise.all([
              postLikesCount.count(ctx, { namespace: post._id }),
              user
                ? ctx.db
                    .query("postLikes")
                    .withIndex("by_postId_and_userId", (q) =>
                      q.eq("postId", post._id).eq("userId", user._id),
                    )
                    .unique()
                    .then((l) => !!l)
                : Promise.resolve(false),
            ]);

            return { ...post, likesCount, userHasLiked };
          }),
        );

        return {
          ...community,
          recentPosts: recentPostsWithLikes,
          membersCount,
          postsCount,
        };
      }),
    );

    return {
      ...result,
      page: communitiesWithPreview,
    };
  },
});

export const getCommunity = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const community = await ctx.db
      .query("communities")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!community) return null;
    return community;
  },
});

export const getMyCommunities = query({
  args: {},
  returns: v.array(schema.doc("communities")),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    const memberships = await ctx.db
      .query("communityMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(100);

    const communities = await Promise.all(
      memberships.map((m) => ctx.db.get(m.communityId)),
    );

    return communities.filter(
      (community): community is NonNullable<typeof community> =>
        community !== null,
    );
  },
});

export const getMyCommunitiesForPosting = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("communities"),
      name: v.string(),
      slug: v.string(),
      role: v.union(
        v.literal("admin"),
        v.literal("member"),
        v.literal("moderator"),
      ),
    }),
  ),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    const memberships = await ctx.db
      .query("communityMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(100);

    const communities = await Promise.all(
      memberships.map(async (membership) => {
        const community = await ctx.db.get(membership.communityId);
        if (!community) return null;
        return {
          _id: community._id,
          name: community.name,
          slug: community.slug,
          role: membership.role,
        };
      }),
    );

    return communities.filter(
      (community): community is NonNullable<typeof community> =>
        community !== null,
    );
  },
});

export const getCommunityWithPosts = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const community = await ctx.db
      .query("communities")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!community) return null;

    const [membersCount, postsCount] = await Promise.all([
      communityMembersCount.count(ctx, { namespace: community._id }),
      communityPostsCount.count(ctx, { namespace: community._id }),
    ]);

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_communityId", (q) =>
        q.eq("communityId", community._id),
      )
      .order("desc")
      .take(100);

    const postsWithLikes = await Promise.all(
      posts.map(async (post) => {
        const [likesCount, userHasLiked] = await Promise.all([
          postLikesCount.count(ctx, { namespace: post._id }),
          user
            ? ctx.db
                .query("postLikes")
                .withIndex("by_postId_and_userId", (q) =>
                  q.eq("postId", post._id).eq("userId", user._id),
                )
                .unique()
                .then((l) => !!l)
            : Promise.resolve(false),
        ]);

        return { ...post, likesCount, userHasLiked };
      }),
    );

    return {
      ...community,
      membersCount,
      postsCount,
      posts: postsWithLikes,
    };
  },
});

export const getCommunityDetails = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const community = await ctx.db
      .query("communities")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!community) return null;

    const [membersCount, postsCount] = await Promise.all([
      communityMembersCount.count(ctx, { namespace: community._id }),
      communityPostsCount.count(ctx, { namespace: community._id }),
    ]);

    return {
      ...community,
      membersCount,
      postsCount,
    };
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    return user;
  },
});

export const getCommunityPosts = query({
  args: {
    communitySlug: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const community = await ctx.db
      .query("communities")
      .withIndex("by_slug", (q) => q.eq("slug", args.communitySlug))
      .unique();

    if (!community) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const postsPage = await ctx.db
      .query("posts")
      .withIndex("by_communityId", (q) => q.eq("communityId", community._id))
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedPage = await Promise.all(
      postsPage.page.map(async (post) => {
        const [likesCount, commentsCount] = await Promise.all([
          postLikesCount.count(ctx, { namespace: post._id }),
          postCommentsCount.count(ctx, { namespace: post._id }),
        ]);

        let userHasLiked = false;
        let isBookmarked = false;
        if (user) {
          const existingLike = await ctx.db
            .query("postLikes")
            .withIndex("by_postId_and_userId", (q) =>
              q.eq("postId", post._id).eq("userId", user._id),
            )
            .unique();
          if (existingLike) userHasLiked = true;

          const existingBookmark = await ctx.db
            .query("bookmarks")
            .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
              q
                .eq("userId", user._id)
                .eq("resourceType", "post")
                .eq("resourceId", post._id),
            )
            .unique();
          if (existingBookmark) isBookmarked = true;
        }

        return {
          ...post,
          likesCount,
          commentsCount,
          userHasLiked,
          isBookmarked,
        };
      }),
    );

    return { ...postsPage, page: enrichedPage };
  },
});

export const getCommunityForDelete = internalQuery({
  args: { id: v.id("communities") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
