import { TableAggregate } from "@convex-dev/aggregate";
import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import { DataModel, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";

export const postLikesCount = new TableAggregate<{
  Namespace: Id<"posts">;
  Key: null;
  DataModel: DataModel;
  TableName: "postLikes";
}>(components.aggregateByLikesPosts, {
  namespace: (doc) => doc.postId,
  sortKey: () => null,
});

export const postCommentsCount = new TableAggregate<{
  Namespace: Id<"posts">;
  Key: null;
  DataModel: DataModel;
  TableName: "postComments";
}>(components.aggregateByComments, {
  namespace: (doc) => doc.postId,
  sortKey: () => null,
});

export const communityPostsCount = new TableAggregate<{
  Namespace: Id<"communities"> | undefined;
  Key: null;
  DataModel: DataModel;
  TableName: "posts";
}>(components.aggregateByCommunityPosts, {
  namespace: (doc) => doc.communityId,
  sortKey: () => null,
});

export const postShuffle = new TableAggregate<{
  DataModel: DataModel;
  TableName: "posts";
  Key: null;
}>(components.postShuffle, {
  sortKey: () => null,
});

export const postSortedByDate = new TableAggregate<{
  DataModel: DataModel;
  TableName: "posts";
  Key: number;
}>(components.postSortedByDate, {
  sortKey: (doc) => doc._creationTime,
});

export const postSortedByLikes = new TableAggregate<{
  DataModel: DataModel;
  TableName: "posts";
  Key: number;
}>(components.postSortedByLikes, {
  sortKey: (doc) => doc.likesCount ?? 0,
});

export const communityMembersCount = new TableAggregate<{
  Namespace: Id<"communities">;
  Key: null;
  DataModel: DataModel;
  TableName: "communityMembers";
}>(components.aggregateByCommunityMembers, {
  namespace: (doc) => doc.communityId,
  sortKey: () => null,
});

// ---- migrations ----

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

export const backfillPostLikesCountMigration = migrations.define({
  table: "postLikes",
  migrateOne: async (ctx, doc) => {
    await postLikesCount.insertIfDoesNotExist(ctx, doc);
  },
});

export const backfillPostCommentsCountMigration = migrations.define({
  table: "postComments",
  migrateOne: async (ctx, doc) => {
    await postCommentsCount.insertIfDoesNotExist(ctx, doc);
  },
});

export const backfillCommunityPostsCountMigration = migrations.define({
  table: "posts",
  migrateOne: async (ctx, doc) => {
    await communityPostsCount.insertIfDoesNotExist(ctx, doc);
  },
});

export const backfillCommunityMembersCountMigration = migrations.define({
  table: "communityMembers",
  migrateOne: async (ctx, doc) => {
    await communityMembersCount.insertIfDoesNotExist(ctx, doc);
  },
});

export const backfillPostShuffleMigration = migrations.define({
  table: "posts",
  migrateOne: async (ctx, doc) => {
    await postShuffle.insertIfDoesNotExist(ctx, doc);
  },
});

export const backfillPostSortedByDateMigration = migrations.define({
  table: "posts",
  migrateOne: async (ctx, doc) => {
    await postSortedByDate.insertIfDoesNotExist(ctx, doc);
  },
});

export const backfillPostSortedByLikesMigration = migrations.define({
  table: "posts",
  migrateOne: async (ctx, doc) => {
    await postSortedByLikes.insertIfDoesNotExist(ctx, doc);
  },
});

export const runAggregateBackfill = migrations.runner([
  internal.aggregates.backfillPostLikesCountMigration,
  internal.aggregates.backfillPostCommentsCountMigration,
  internal.aggregates.backfillCommunityPostsCountMigration,
  internal.aggregates.backfillCommunityMembersCountMigration,
  internal.aggregates.backfillPostShuffleMigration,
  internal.aggregates.backfillPostSortedByDateMigration,
  internal.aggregates.backfillPostSortedByLikesMigration,
]);

// ---- clear aggregates ----

const _clearAggregates = async (ctx: MutationCtx) => {
  for await (const post of ctx.db.query("posts")) {
    await postLikesCount.clear(ctx, { namespace: post._id });
    await postCommentsCount.clear(ctx, { namespace: post._id });
  }

  for await (const community of ctx.db.query("communities")) {
    await communityPostsCount.clear(ctx, { namespace: community._id });
    await communityMembersCount.clear(ctx, { namespace: community._id });
  }

  await postShuffle.clear(ctx);
  await postSortedByDate.clear(ctx);
  await postSortedByLikes.clear(ctx);
};

export const clearAggregates = internalMutation(_clearAggregates);
