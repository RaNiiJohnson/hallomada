import { CascadingDeletes } from "@sholajegede/convex-cascading-deletes";
import { components, internal } from "./_generated/api";
import { ActionCtx } from "./_generated/server";

/**
 * Configuration des relations parent-enfant pour le cascade delete.
 *
 * Arbre de dépendances pour `communities` :
 *   communities
 *   ├── communityMembers   (by_communityId → communityId)
 *   ├── communityMessages   (by_communityId → communityId)
 *   └── posts               (by_communityId → communityId)
 *       ├── postLikes        (by_postId → postId)
 *       ├── postComments     (by_postId → postId)
 *       │   ├── postCommentLikes   (by_commentId → commentId)
 *       │   └── postCommentReplies (by_commentId → commentId)
 *       │       └── postCommentReplyLikes (by_replyId → replyId)
 *       ├── bookmarks        (by_resourceId → resourceId)
 *       └── postTranslations (by_post → postId)
 */
export const cascadeRelationships = [
  {
    sourceTable: "communities",
    targetTable: "user",
    indexName: "by_authorId",
    fieldName: "authorId",
  },
  // --- communities → children ---
  {
    sourceTable: "communityMembers",
    targetTable: "communities",
    indexName: "by_communityId",
    fieldName: "communityId",
  },
  {
    sourceTable: "communityMessages",
    targetTable: "communities",
    indexName: "by_communityId",
    fieldName: "communityId",
  },
  {
    sourceTable: "posts",
    targetTable: "communities",
    indexName: "by_communityId",
    fieldName: "communityId",
  },

  // --- posts → children ---
  {
    sourceTable: "postLikes",
    targetTable: "posts",
    indexName: "by_postId",
    fieldName: "postId",
  },
  {
    sourceTable: "postComments",
    targetTable: "posts",
    indexName: "by_postId",
    fieldName: "postId",
  },
  {
    sourceTable: "bookmarks",
    targetTable: "posts",
    indexName: "by_resourceId",
    fieldName: "resourceId",
  },
  {
    sourceTable: "postTranslations",
    targetTable: "posts",
    indexName: "by_post",
    fieldName: "postId",
  },

  // --- postComments → children ---
  {
    sourceTable: "postCommentLikes",
    targetTable: "postComments",
    indexName: "by_commentId",
    fieldName: "commentId",
  },
  {
    sourceTable: "postCommentReplies",
    targetTable: "postComments",
    indexName: "by_commentId",
    fieldName: "commentId",
  },

  // --- postCommentReplies → children ---
  {
    sourceTable: "postCommentReplyLikes",
    targetTable: "postCommentReplies",
    indexName: "by_replyId",
    fieldName: "replyId",
  },

  // --- jobs → children ---
  {
    sourceTable: "jobTranslations",
    targetTable: "JobOffer",
    indexName: "by_job",
    fieldName: "jobId",
  },
  {
    sourceTable: "JobContactInfo",
    targetTable: "JobOffer",
    indexName: "by_jobId",
    fieldName: "jobId",
  },
  {
    sourceTable: "bookmarks",
    targetTable: "JobOffer",
    indexName: "by_resourceId",
    fieldName: "resourceId",
  },
];

export const cascadingDeletes = new CascadingDeletes(
  components.convexCascadingDeletes,
  {
    relationships: cascadeRelationships,
  },
);

/**
 * Helper générique pour exécuter une suppression en cascade
 * sans avoir à réécrire le resolver et le deleter à chaque fois.
 */
export async function runCascadeDelete(
  ctx: ActionCtx,
  table: string,
  id: string,
): Promise<Record<string, number>> {
  return await cascadingDeletes.deleteWithCascade(ctx, {
    table,
    id,
    resolver: async (sourceTable, parentTable, parentId) => {
      const rel = cascadeRelationships.find(
        (r) => r.sourceTable === sourceTable && r.targetTable === parentTable,
      );
      if (!rel) return [];
      return await ctx.runQuery(internal.cascadeHelpers.resolveChildren, {
        sourceTable,
        indexName: rel.indexName,
        fieldName: rel.fieldName,
        parentId,
      });
    },
    deleter: async (targetTable, targetId) => {
      if (targetTable === "user") {
        return;
      }
      await ctx.runMutation(internal.cascadeHelpers.deleteDocument, {
        table: targetTable,
        id: targetId,
      });
    },
  });
}
