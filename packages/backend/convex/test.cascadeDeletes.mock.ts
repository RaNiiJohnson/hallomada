/**
 * Global mock for cascade deletes.
 * We only stub `runCascadeDelete` (the function actually called by
 * convex/posts/actions.ts) instead of the whole module, so
 * `cascadeRelationships` and other exports stay real in case anything
 * else needs them.
 *
 * `cascadingDeletes` itself (the CascadingDeletes(components.convexCascadingDeletes, ...)
 * instance) is created lazily and only touches the component boundary when
 * `.deleteWithCascade` is actually called — which we bypass entirely here.
 */
import { vi } from "vitest";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

vi.mock("./cascadeDeletes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./cascadeDeletes")>();
  return {
    ...actual,
    runCascadeDelete: vi.fn(
      async (ctx: ActionCtx, table: string, id: string) => {
        const counts: Record<string, number> = {};

        const visit = async (targetTable: string, targetId: string) => {
          const relationships = actual.cascadeRelationships.filter(
            (relationship) => relationship.targetTable === targetTable,
          );
          for (const relationship of relationships) {
            const childIds = await ctx.runQuery(
              internal.cascadeHelpers.resolveChildren,
              {
                sourceTable: relationship.sourceTable,
                indexName: relationship.indexName,
                fieldName: relationship.fieldName,
                parentId: targetId,
              },
            );
            for (const childId of childIds) {
              await visit(relationship.sourceTable, childId);
            }
          }

          await ctx.runMutation(internal.cascadeHelpers.deleteDocument, {
            table: targetTable,
            id: targetId,
          });
          counts[targetTable] = (counts[targetTable] ?? 0) + 1;
        };

        await visit(table, id);
        return counts;
      },
    ),
  };
});
