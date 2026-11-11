import {
  customAction,
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import { action, mutation, query } from "./_generated/server";
import { DataModel } from "./_generated/dataModel";
import {
  communityMembersCount,
  communityPostsCount,
  postCommentsCount,
  postLikesCount,
  postShuffle,
  postSortedByDate,
  postSortedByLikes,
} from "./aggregates";
import { requireAdmin, requireAuth } from "./auth/auth";

/**
 * Tables whose writes maintain aggregate-component indexes.  Mutations built
 * with `authMutation` receive a wrapped `ctx.db`, so inserts, patches, and
 * deletes on these tables update the corresponding aggregate atomically.
 */
const aggregateTriggers = new Triggers<DataModel>();
aggregateTriggers.register("postLikes", postLikesCount.trigger());
aggregateTriggers.register("postComments", postCommentsCount.trigger());
aggregateTriggers.register("posts", communityPostsCount.trigger());
aggregateTriggers.register("communityMembers", communityMembersCount.trigger());
aggregateTriggers.register("posts", postShuffle.trigger());
aggregateTriggers.register("posts", postSortedByDate.trigger());
aggregateTriggers.register("posts", postSortedByLikes.trigger());

/**
 * User-centric function builders. The authenticated user (the betterAuth user
 * row, with SaveIt custom fields) is resolved server-side via `requireAuth`.
 * NEVER trust a client-passed `userId`; always read `ctx.user._id`.
 */
export const authQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const { user } = await requireAuth(ctx);
    return { user };
  }),
);

export const authMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const { user } = await requireAuth(ctx);
    return aggregateTriggers.wrapDB({ ...ctx, user });
  }),
);

export const authAction = customAction(
  action,
  customCtx(async (ctx) => {
    const { user } = await requireAuth(ctx);
    return { user };
  }),
);

export const adminQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const { user } = await requireAdmin(ctx);
    return { user };
  }),
);

export const adminMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const { user } = await requireAdmin(ctx);
    return { user };
  }),
);

export const adminAction = customAction(
  action,
  customCtx(async (ctx) => {
    const { user } = await requireAdmin(ctx);
    return { user };
  }),
);

export {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
