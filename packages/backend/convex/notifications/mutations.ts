import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import { authMutation, internalMutation } from "../functions";
import { throwForbidden, throwNotFound } from "../utils/errors";

async function markUnreadBatch(ctx: MutationCtx, userId: string) {
  const unread = await ctx.db
    .query("notifications")
    .withIndex("by_userId_read", (q) =>
      q.eq("userId", userId).eq("read", false),
    )
    .take(100);

  for (const notification of unread) {
    await ctx.db.patch(notification._id, { read: true });
  }
  return unread.length;
}

export const markAllRead = authMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const processed = await markUnreadBatch(ctx, ctx.user._id);
    if (processed === 100) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.mutations.continueMarkAllRead,
        { userId: ctx.user._id },
      );
    }
    return null;
  },
});

export const continueMarkAllRead = internalMutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const processed = await markUnreadBatch(ctx, userId);
    if (processed === 100) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.mutations.continueMarkAllRead,
        { userId },
      );
    }
    return null;
  },
});

export const markOneRead = authMutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throwNotFound("Notification not found");
    if (notification.userId !== ctx.user._id) {
      throwForbidden("Not allowed to update this notification");
    }
    await ctx.db.patch(args.notificationId, { read: true });
    return null;
  },
});

const DELETE_BATCH = 100;

export const deleteByCommunity = internalMutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_communitySlug", (q) => q.eq("communitySlug", args.slug))
      .take(DELETE_BATCH);

    for (const notif of notifications) {
      await ctx.db.delete(notif._id);
    }
    if (notifications.length === DELETE_BATCH) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.mutations.deleteByCommunity,
        args,
      );
    }
  },
});

export const deleteByPost = internalMutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_postSlug", (q) => q.eq("postSlug", args.slug))
      .take(DELETE_BATCH);

    for (const notif of notifications) {
      await ctx.db.delete(notif._id);
    }
    if (notifications.length === DELETE_BATCH) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.mutations.deleteByPost,
        args,
      );
    }
  },
});
