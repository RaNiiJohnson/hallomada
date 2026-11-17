import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";

const migrations = new Migrations<DataModel>(components.migrations);

/**
 * Idempotent cleanup for legacy duplicate bookmarks. Keep the oldest row for
 * each user/type/resource tuple and remove every later duplicate.
 *
 * Run explicitly on a non-production rehearsal before scheduling production:
 * `npx convex run bookmarks/migrations:runBookmarkDedupe`
 */
export const dedupeBookmarks = migrations.define({
  table: "bookmarks",
  migrateOne: async (ctx, bookmark) => {
    const canonical = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
        q
          .eq("userId", bookmark.userId)
          .eq("resourceType", bookmark.resourceType)
          .eq("resourceId", bookmark.resourceId),
      )
      .order("asc")
      .first();

    if (canonical && canonical._id !== bookmark._id) {
      await ctx.db.delete(bookmark._id);
    }
  },
});

export const runBookmarkDedupe = migrations.runner([
  internal.bookmarks.migrations.dedupeBookmarks,
]);
