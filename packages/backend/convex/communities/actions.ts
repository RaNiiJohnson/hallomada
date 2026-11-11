import { v } from "convex/values";
import { internal } from "../_generated/api";
import { runCascadeDelete } from "../cascadeDeletes";
import { authAction } from "../functions";
import { throwNotFound } from "../utils/errors";

/**
 *
 * Delete a community and all its child documents * (members, messages, posts, likes, comments, replies, reply likes) * using cascade delete.
 *
 */
export const deleteCommunity = authAction({
  args: { id: v.id("communities") },

  handler: async (ctx, args) => {
    const community = await ctx.runQuery(
      internal.communities.queries.getCommunityForDelete,
      { id: args.id },
    );

    if (!community || community.authorId !== ctx.user._id) {
      throwNotFound("Community not found");
    }

    await ctx.runMutation(internal.notifications.mutations.deleteByCommunity, {
      slug: community.slug,
    });

    const counts = await runCascadeDelete(ctx, "communities", args.id);

    // await posthog.capture(ctx, {
    //   distinctId: posthogDistinctId(ctx.user._id),
    //   event: "community_deleted",
    //   properties: {
    //     community_id: args.id,
    //     slug: community.slug,
    //   },
    // });

    return counts;
  },
});
