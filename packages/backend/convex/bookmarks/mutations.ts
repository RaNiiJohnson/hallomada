import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { authMutation } from "../functions";
import { throwNotFound, throwValidationError } from "../utils/errors";

type BookmarkResourceType = "job" | "realEstate" | "post";
type BookmarkResourceId =
  | Id<"JobOffer">
  | Id<"RealestateListing">
  | Id<"posts">;

async function buildBookmarkSnapshot(
  ctx: Pick<MutationCtx, "db">,
  resourceType: BookmarkResourceType,
  resourceId: BookmarkResourceId,
) {
  if (resourceType === "job") {
    const jobId = ctx.db.normalizeId("JobOffer", resourceId);
    const job = jobId ? await ctx.db.get(jobId) : null;
    if (!job) throwNotFound("Bookmark resource not found");
    return {
      title: job.title,
      href: `/jobs/${job.slug}`,
      subtitle: `${job.company} · ${job.city}`,
    };
  }
  if (resourceType === "realEstate") {
    const listingId = ctx.db.normalizeId("RealestateListing", resourceId);
    const listing = listingId ? await ctx.db.get(listingId) : null;
    if (!listing) throwNotFound("Bookmark resource not found");
    return {
      title: listing.title,
      href: `/listing/${listing.slug}`,
      subtitle: listing.city,
    };
  }
  const postId = ctx.db.normalizeId("posts", resourceId);
  const post = postId ? await ctx.db.get(postId) : null;
  if (!post) throwNotFound("Bookmark resource not found");
  return {
    title: post.title,
    href: post.communitySlug
      ? `/communities/${post.communitySlug}/${post.slug}`
      : `/posts/${post.slug}`,
    subtitle: post.communityName,
  };
}

export const toggleBookmark = authMutation({
  args: {
    resourceId: v.union(
      v.id("JobOffer"),
      v.id("RealestateListing"),
      v.id("posts"),
    ),
    resourceType: v.union(
      v.literal("job"),
      v.literal("realEstate"),
      v.literal("post"),
    ),
  },
  returns: v.object({ bookmarked: v.boolean() }),
  handler: async (ctx, args) => {
    const user = ctx.user;
    const target =
      args.resourceType === "job"
        ? { table: "JobOffer" as const }
        : args.resourceType === "realEstate"
          ? { table: "RealestateListing" as const }
          : { table: "posts" as const };
    const normalizedResourceId = ctx.db.normalizeId(
      target.table,
      args.resourceId,
    );

    if (!normalizedResourceId) {
      throwValidationError("Resource type and identifier do not match");
    }

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
        q
          .eq("userId", user._id)
          .eq("resourceType", args.resourceType)
          .eq("resourceId", normalizedResourceId),
      )
      .take(100);

    if (existing.length > 0) {
      for (const bookmark of existing) {
        await ctx.db.delete(bookmark._id);
      }
      // await posthog.capture(ctx, {
      //   distinctId: posthogDistinctId(user._id),
      //   event: "bookmark_removed",
      //   properties: {
      //     resource_id: args.resourceId,
      //     resource_type: args.resourceType,
      //   },
      // });
      return { bookmarked: false };
    }

    const snapshot = await buildBookmarkSnapshot(
      ctx,
      args.resourceType,
      args.resourceId,
    );

    await ctx.db.insert("bookmarks", {
      userId: user._id,
      resourceId: normalizedResourceId,
      resourceType: args.resourceType,
      snapshot,
    });
    // await posthog.capture(ctx, {
    //   distinctId: posthogDistinctId(user._id),
    //   event: "bookmark_added",
    //   properties: {
    //     resource_id: args.resourceId,
    //     resource_type: args.resourceType,
    //   },
    // });
    return { bookmarked: true };
  },
});

/** Repairs a legacy favorite only when its owner opens it from their private space. */
export const resolveLegacyBookmark = authMutation({
  args: { bookmarkId: v.id("bookmarks") },
  handler: async (ctx, args) => {
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== ctx.user._id) {
      throwNotFound("Bookmark not found");
    }

    const snapshot =
      bookmark.snapshot ??
      (await buildBookmarkSnapshot(
        ctx,
        bookmark.resourceType,
        bookmark.resourceId,
      ));
    if (!bookmark.snapshot) {
      await ctx.db.patch(bookmark._id, { snapshot });
    }
    return snapshot;
  },
});
