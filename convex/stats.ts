import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { authComponent } from "./auth/auth";
import { hasPremium } from "./premium";
import { limiter } from "./rateLimits";
import { dayKey, STATS_DAYS, VIEW_DEDUP_MS } from "./statsValues";

/**
 * View statistics for listings and job offers. Views are counted per day,
 * once per visitor every VIEW_DEDUP_MS, and never for the author. Owners
 * with Premium see them on their publication.
 */

const resourceValidator = v.union(
  v.object({ type: v.literal("listing"), id: v.id("RealestateListing") }),
  v.object({ type: v.literal("job"), id: v.id("JobOffer") }),
);

const MAX_DAYS_SUMMED = 400;
const MAX_COUNTED = 1000;

export const recordView = mutation({
  args: { resource: resourceValidator, visitorId: v.string() },
  returns: v.null(),
  handler: async (ctx, { resource, visitorId }) => {
    if (visitorId.length < 8 || visitorId.length > 64) return null;
    const doc: Doc<"RealestateListing"> | Doc<"JobOffer"> | null =
      await ctx.db.get(resource.id);
    if (!doc || (doc.status !== undefined && doc.status !== "active")) return null;

    const viewer = await authComponent.safeGetAuthUser(ctx);
    if (viewer?._id === doc.authorId) return null;

    const resourceKey = `${resource.type}:${resource.id}`;
    // The name is not declared in rateLimits.ts on purpose: a per-call config
    // is only accepted for names the limiter does not know statically.
    const seen = await limiter.limit(ctx, "publicationView", {
      key: `${resourceKey}:${viewer?._id ?? visitorId}`,
      config: { kind: "token bucket", rate: 1, period: VIEW_DEDUP_MS, capacity: 1 },
    });
    if (!seen.ok) return null;

    const day = dayKey(Date.now());
    const bucket = await ctx.db
      .query("publicationViews")
      .withIndex("by_resourceKey_and_day", (q) =>
        q.eq("resourceKey", resourceKey).eq("day", day),
      )
      .unique();
    if (bucket) await ctx.db.patch(bucket._id, { views: bucket.views + 1 });
    else await ctx.db.insert("publicationViews", { resourceKey, day, views: 1 });
    return null;
  },
});

async function countResponses(
  ctx: QueryCtx,
  resource: { type: "listing" | "job"; id: string },
) {
  if (resource.type === "job") {
    const id = ctx.db.normalizeId("JobOffer", resource.id);
    if (!id) return 0;
    return (
      await ctx.db
        .query("jobApplications")
        .withIndex("by_jobId_and_candidateId", (q) => q.eq("jobId", id))
        .take(MAX_COUNTED)
    ).length;
  }
  const id = ctx.db.normalizeId("RealestateListing", resource.id);
  if (!id) return 0;
  return (
    await ctx.db
      .query("rentalApplications")
      .withIndex("by_listingId_and_candidateId", (q) => q.eq("listingId", id))
      .take(MAX_COUNTED)
  ).length;
}

export const getForPublication = query({
  args: {
    resource: resourceValidator,
    // The viewer's current UTC day ("YYYY-MM-DD"); queries don't read the clock.
    today: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({ premium: v.literal(false) }),
    v.object({
      premium: v.literal(true),
      totalViews: v.number(),
      last7Days: v.number(),
      daily: v.array(v.object({ day: v.string(), views: v.number() })),
      bookmarks: v.number(),
      responses: v.number(),
    }),
  ),
  handler: async (ctx, { resource, today }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    const doc: Doc<"RealestateListing"> | Doc<"JobOffer"> | null =
      await ctx.db.get(resource.id);
    if (!doc || doc.authorId !== user._id) return null;
    if (!(await hasPremium(ctx, user._id))) return { premium: false as const };

    const todayTime = Date.parse(`${today}T00:00:00Z`);
    if (Number.isNaN(todayTime)) return null;
    const days = Array.from({ length: STATS_DAYS }, (_, i) =>
      dayKey(todayTime - (STATS_DAYS - 1 - i) * 24 * 60 * 60 * 1000),
    );

    const resourceKey = `${resource.type}:${resource.id}`;
    const buckets = await ctx.db
      .query("publicationViews")
      .withIndex("by_resourceKey_and_day", (q) => q.eq("resourceKey", resourceKey))
      .order("desc")
      .take(MAX_DAYS_SUMMED);
    const byDay = new Map(buckets.map((bucket) => [bucket.day, bucket.views]));
    const daily = days.map((day) => ({ day, views: byDay.get(day) ?? 0 }));

    const bookmarks = (
      await ctx.db
        .query("bookmarks")
        .withIndex("by_resourceId", (q) => q.eq("resourceId", resource.id))
        .take(MAX_COUNTED)
    ).length;

    return {
      premium: true as const,
      totalViews: buckets.reduce((sum, bucket) => sum + bucket.views, 0),
      last7Days: daily.slice(-7).reduce((sum, entry) => sum + entry.views, 0),
      daily,
      bookmarks,
      responses: await countResponses(ctx, resource),
    };
  },
});
