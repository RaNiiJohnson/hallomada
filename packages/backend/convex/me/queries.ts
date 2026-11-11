import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { authComponent } from "../auth/auth";
import { query } from "../functions";

const emptyPage = () => ({
  page: [],
  isDone: true,
  continueCursor: "",
});

export function isPublicProfilePost(
  post: Pick<Doc<"posts">, "scope" | "communityId">,
  community: Pick<Doc<"communities">, "privacy"> | null,
) {
  if (post.communityId) return community?.privacy === "public";
  return post.scope !== "community";
}

/** Personal publications are never selected by a caller-supplied user id. */
export const getMyJobOffers = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return emptyPage();
    return await ctx.db
      .query("JobOffer")
      .withIndex("by_authorId", (q) => q.eq("authorId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getMyListings = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return emptyPage();
    return await ctx.db
      .query("RealestateListing")
      .withIndex("by_authorId", (q) => q.eq("authorId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getMyProviders = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return emptyPage();
    return await ctx.db
      .query("providers")
      .withIndex("by_authorId_and_status", (q) => q.eq("authorId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getMyPosts = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return emptyPage();
    return await ctx.db
      .query("posts")
      .withIndex("by_authorId", (q) => q.eq("authorId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getMyCommunities = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return emptyPage();

    const memberships = await ctx.db
      .query("communityMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    const communities = await Promise.all(
      memberships.page.map(async (membership) => {
        const community = await ctx.db.get(membership.communityId);
        return community
          ? {
              _id: community._id,
              name: community.name,
              slug: community.slug,
              role: membership.role,
            }
          : null;
      }),
    );

    return {
      ...memberships,
      page: communities.filter(
        (community): community is NonNullable<typeof community> =>
          community !== null,
      ),
    };
  },
});

export const getMyApplications = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return emptyPage();

    const applications = await ctx.db
      .query("jobApplications")
      .withIndex("by_candidateId", (q) => q.eq("candidateId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      applications.page.map(async (application) => {
        const job = await ctx.db.get(application.jobId);
        return {
          _id: application._id,
          appliedAt: application.appliedAt,
          emailStatus: application.emailStatus ?? "pending",
          job: job ? { title: job.title, slug: job.slug, company: job.company } : null,
        };
      }),
    );

    return { ...applications, page };
  },
});

export const getPublicActivity = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const profile = await ctx.runQuery(
      components.betterAuth.users.getUserById,
      { id: args.userId, viewerId: user?._id },
    );
    if (!profile || !profile.isPublic && profile._id !== user?._id) {
      return [];
    }

    const [jobs, listings, posts] = await Promise.all([
      ctx.db
        .query("JobOffer")
        .withIndex("by_authorId", (q) => q.eq("authorId", args.userId))
        .order("desc")
        .take(100),
      ctx.db
        .query("RealestateListing")
        .withIndex("by_authorId", (q) => q.eq("authorId", args.userId))
        .order("desc")
        .take(100),
      ctx.db
        .query("posts")
        .withIndex("by_authorId", (q) => q.eq("authorId", args.userId))
        .order("desc")
        .take(4),
    ]);

    const publicPosts = await Promise.all(
      posts.map(async (post) => {
        const community = post.communityId
          ? await ctx.db.get(post.communityId)
          : null;
        return isPublicProfilePost(post, community) ? post : null;
      }),
    );

    return [
      ...jobs
        .filter((job) => job.status === undefined || job.status === "active")
        .map((job) => ({ title: job.title, href: `/jobs/${job.slug}`, kind: "job" as const })),
      ...listings
        .filter((listing) => listing.status === undefined || listing.status === "active")
        .map((listing) => ({ title: listing.title, href: `/listing/${listing.slug}`, kind: "listing" as const })),
      ...publicPosts
        .filter((post): post is NonNullable<typeof post> => post !== null)
        .map((post) => ({
        title: post.title,
        href: post.communitySlug
          ? `/communities/${post.communitySlug}/${post.slug}`
          : `/posts/${post.slug}`,
        kind: "post" as const,
      })),
    ].slice(0, 8);
  },
});
