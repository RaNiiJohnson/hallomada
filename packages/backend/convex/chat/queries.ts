import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import schema from "../schema";
import { authQuery, query } from "../functions";
import { authComponent } from "../auth/auth";
import type { Id } from "../_generated/dataModel";
import { throwForbidden, throwNotFound } from "../utils/errors";

export const getMessages = authQuery({
  args: {
    communityId: v.id("communities"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(schema.doc("communityMessages")),
  handler: async (ctx, args) => {
    const community = await ctx.db.get(args.communityId);
    if (!community) throwNotFound("Community not found");

    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_userId_and_communityId", (q) =>
        q.eq("userId", ctx.user._id).eq("communityId", args.communityId),
      )
      .unique();
    if (!membership) {
      throwForbidden("Community membership required");
    }

    return await ctx.db
      .query("communityMessages")
      .withIndex("by_communityId", (q) => q.eq("communityId", args.communityId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Return just the communityIds that have unread messages
export const getCommunitiesWithUnread = query({
  args: {},
  returns: v.array(v.id("communities")),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    const memberships = await ctx.db
      .query("communityMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(100);

    const unreadCommunityIds: Id<"communities">[] = [];

    await Promise.all(
      memberships.map(async (member) => {
        const lastReadAt = member.lastReadAt ?? 0;

        const hasUnread = await ctx.db
          .query("communityMessages")
          .withIndex("by_communityId", (q) =>
            q
              .eq("communityId", member.communityId)
              .gt("_creationTime", lastReadAt),
          )
          .first();

        if (hasUnread) {
          unreadCommunityIds.push(member.communityId);
        }
      }),
    );

    return unreadCommunityIds;
  },
});
