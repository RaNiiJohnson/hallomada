import { v } from "convex/values";
import { authMutation } from "../functions";
import { limiter } from "../rateLimits";
import {
  throwForbidden,
  throwLimitReached,
  throwNotFound,
} from "../utils/errors";
import { assertMessageContent, MAX_LENGTH } from "../utils/limits";

export const sendMessage = authMutation({
  args: {
    communityId: v.id("communities"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = ctx.user;
    const member = await ctx.db
      .query("communityMembers")
      .withIndex("by_userId_and_communityId", (q) =>
        q.eq("userId", user._id).eq("communityId", args.communityId),
      )
      .unique();

    if (!member) throw new Error("Not a member");

    assertMessageContent("Message", args.content, MAX_LENGTH.chatMessage);
    const rate = await limiter.limit(ctx, "chatMessagePerUser", {
      key: user._id,
    });
    if (!rate.ok) {
      throwLimitReached("Chat message rate limit reached", {
        retryAfter: rate.retryAfter ?? 0,
      });
    }

    await ctx.db.insert("communityMessages", {
      communityId: args.communityId,
      authorId: user._id,
      authorName: user.name,
      content: args.content,
    });

    // Update lastReadAt for the sender only
    await ctx.db.patch(member._id, {
      lastReadAt: Date.now(),
    });
    return null;

    // await posthog.capture(ctx, {
    //   distinctId: posthogDistinctId(user._id),
    //   event: "chat_message_sent",
    //   properties: { community_id: args.communityId },
    //   groups: { community: args.communityId },
    // });
  },
});

export const editMessage = authMutation({
  args: {
    id: v.id("communityMessages"),
    communityId: v.id("communities"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = ctx.user;
    const member = await ctx.db
      .query("communityMembers")
      .withIndex("by_userId_and_communityId", (q) =>
        q.eq("userId", user._id).eq("communityId", args.communityId),
      )
      .unique();

    if (!member) throw new Error("Not a member");

    const message = await ctx.db.get(args.id);
    if (!message) throw new Error("Message not found");

    if (message.authorId !== user._id) throw new Error("Not authorized");

    assertMessageContent("Message", args.content, MAX_LENGTH.chatMessage);
    await ctx.db.patch(args.id, {
      content: args.content,
      editedAt: Date.now(),
    });
    return null;
  },
});

export const deleteMessage = authMutation({
  args: {
    id: v.id("communityMessages"),
    communityId: v.id("communities"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = ctx.user;
    const member = await ctx.db
      .query("communityMembers")
      .withIndex("by_userId_and_communityId", (q) =>
        q.eq("userId", user._id).eq("communityId", args.communityId),
      )
      .unique();

    if (!member) throwForbidden("Not a member");

    const message = await ctx.db.get(args.id);
    if (!message) throwNotFound("Message not found");

    if (message.authorId !== user._id) throwForbidden("Not authorized");

    await ctx.db.delete(args.id);
    return null;
  },
});

export const markAsRead = authMutation({
  args: { communityId: v.id("communities") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = ctx.user;
    const member = await ctx.db
      .query("communityMembers")
      .withIndex("by_userId_and_communityId", (q) =>
        q.eq("userId", user._id).eq("communityId", args.communityId),
      )
      .unique();

    if (!member) return null;
    await ctx.db.patch(member._id, { lastReadAt: Date.now() });
    return null;
  },
});
