import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import { v } from "convex/values";
import { DataModel, Id, TableNames } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  communityMembersCount,
  communityPostsCount,
  postCommentsCount,
  postLikesCount,
  postShuffle,
  postSortedByDate,
  postSortedByLikes,
} from "./aggregates";

/** Upper bound of children resolved per relationship in one cascade pass. */
const MAX_CHILDREN = 1000;

const triggers = new Triggers<DataModel>();
triggers.register("postLikes", postLikesCount.trigger());
triggers.register("postComments", postCommentsCount.trigger());
triggers.register("posts", communityPostsCount.trigger());
triggers.register("communityMembers", communityMembersCount.trigger());
triggers.register("posts", postShuffle.trigger());
triggers.register("posts", postSortedByDate.trigger());
triggers.register("posts", postSortedByLikes.trigger());

const mutationWithTriggers = customMutation(
  internalMutation,
  customCtx(triggers.wrapDB),
);

/**
 * Generic resolver : trouve tous les documents enfants dans `sourceTable`
 * dont le champ `fieldName` (indexé par `indexName`) vaut `parentId`.
 * Retourne un tableau d'IDs (strings).
 */
export const resolveChildren = internalQuery({
  args: {
    sourceTable: v.string(),
    indexName: v.string(),
    fieldName: v.string(),
    parentId: v.string(),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query(args.sourceTable as TableNames)
      .withIndex(args.indexName as never, (q) =>
        q.eq(args.fieldName as never, args.parentId as never),
      )
      .take(MAX_CHILDREN);
    return docs.map((d) => d._id);
  },
});

/**
 * Generic deleter : supprime un document par table et ID,
 * avec les triggers activés pour mettre à jour les aggregates.
 */
export const deleteDocument = mutationWithTriggers({
  args: {
    table: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id as Id<TableNames>);
  },
});
