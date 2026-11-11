import { paginationOptsValidator } from "convex/server";
import { authQuery } from "../functions";

/**
 * Private, paginated favorites. New bookmarks carry a small display snapshot,
 * so one page is read directly from the bookmarks index instead of requiring
 * an additional read for every saved job, listing, or post.
 */
export const getMyBookmarks = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map((bookmark) => ({
        ...bookmark,
        // Legacy favorites predate snapshots. Keep the bookmark private and
        // visible as an unavailable saved item instead of reintroducing N+1.
        snapshot: bookmark.snapshot ?? null,
      })),
    };
  },
});
