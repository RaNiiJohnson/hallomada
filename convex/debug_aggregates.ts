import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  communityMembersCount,
  communityPostsCount,
  postCommentsCount,
  postLikesCount,
  postShuffle,
  postSortedByDate,
  postSortedByLikes,
} from "./aggregates";

/**
 * Diagnostic query: compare real post count vs aggregate counts.
 */
export const checkSync = internalQuery({
  args: {},
  returns: v.object({
    realPostCount: v.number(),
    aggregates: v.object({
      shuffle: v.number(),
      date: v.number(),
      likes: v.number(),
    }),
    inSync: v.boolean(),
  }),
  handler: async (ctx) => {
    let realCount = 0;
    for await (const post of ctx.db.query("posts")) {
      if (post) realCount++;
    }

    const shuffleCount = await postShuffle.count(ctx);
    const dateCount = await postSortedByDate.count(ctx);
    const likesCount = await postSortedByLikes.count(ctx);

    return {
      realPostCount: realCount,
      aggregates: { shuffle: shuffleCount, date: dateCount, likes: likesCount },
      inSync:
        realCount === shuffleCount &&
        realCount === dateCount &&
        realCount === likesCount,
    };
  },
});

/**
 * Nuclear clear + rebuild of all aggregates.
 */
export const rebuildAllAggregates = internalMutation({
  args: {},
  handler: async (ctx) => {
    await postShuffle.clear(ctx);
    await postSortedByDate.clear(ctx);
    await postSortedByLikes.clear(ctx);

    let posts = 0;
    for await (const post of ctx.db.query("posts")) {
      await postLikesCount.clear(ctx, { namespace: post._id });
      await postCommentsCount.clear(ctx, { namespace: post._id });
      posts++;
    }

    let communities = 0;
    for await (const community of ctx.db.query("communities")) {
      await communityPostsCount.clear(ctx, { namespace: community._id });
      await communityMembersCount.clear(ctx, { namespace: community._id });
      communities++;
    }

    for await (const post of ctx.db.query("posts")) {
      await postShuffle.insert(ctx, post);
      await postSortedByDate.insert(ctx, post);
      await postSortedByLikes.insert(ctx, post);
      await communityPostsCount.insert(ctx, post);
    }

    let postLikes = 0;
    for await (const like of ctx.db.query("postLikes")) {
      await postLikesCount.insert(ctx, like);
      postLikes++;
    }

    let postComments = 0;
    for await (const comment of ctx.db.query("postComments")) {
      await postCommentsCount.insert(ctx, comment);
      postComments++;
    }

    let communityMembers = 0;
    for await (const member of ctx.db.query("communityMembers")) {
      await communityMembersCount.insert(ctx, member);
      communityMembers++;
    }

    return {
      rebuilt: {
        posts,
        postLikes,
        postComments,
        communities,
        communityMembers,
      },
    };
  },
});
