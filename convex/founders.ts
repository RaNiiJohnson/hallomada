import { v } from "convex/values";
import { migrations } from "./aggregates";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { adminMutation, adminQuery } from "./functions";

/**
 * "Membre fondateur" badge.
 *
 * Rules: a member earns the badge with their first publication made while the
 * founder program is open. A publication is a community post (counted on
 * creation) or a job offer / real estate listing (counted once approved by
 * moderation). The badge is permanent. Administrators close the program by
 * setting `closesAt`, typically the day paid Premium launches.
 */

async function getClosesAt(ctx: QueryCtx): Promise<number | null> {
  const row = await ctx.db.query("founderProgram").first();
  return row?.closesAt ?? null;
}

async function findFounder(ctx: QueryCtx, userId: string) {
  return await ctx.db
    .query("founders")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

/**
 * Grants the badge to `userId` if they do not have it yet and the program was
 * open at `publishedAt`. Runs inside the caller's mutation.
 */
export async function grantFounderIfEligible(
  ctx: MutationCtx,
  userId: string,
  publishedAt: number = Date.now(),
) {
  if (await findFounder(ctx, userId)) return;
  const closesAt = await getClosesAt(ctx);
  if (closesAt !== null && publishedAt >= closesAt) return;
  await ctx.db.insert("founders", { userId, since: publishedAt });
}

export const isFounder = query({
  args: { userId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { userId }) => (await findFounder(ctx, userId)) !== null,
});

export const getProgram = adminQuery({
  args: {},
  returns: v.object({ closesAt: v.union(v.number(), v.null()) }),
  handler: async (ctx) => ({ closesAt: await getClosesAt(ctx) }),
});

export const setProgramClosesAt = adminMutation({
  args: { closesAt: v.union(v.number(), v.null()) },
  returns: v.null(),
  handler: async (ctx, { closesAt }) => {
    const next = { closesAt, updatedAt: Date.now(), updatedBy: ctx.user._id };
    const existing = await ctx.db.query("founderProgram").first();
    if (existing) await ctx.db.patch(existing._id, next);
    else await ctx.db.insert("founderProgram", next);
    return null;
  },
});

// ---- backfill for publications made before the badge existed ----
// Run once per deployment:
//   npx convex run aggregates:run '{"fn": "founders:backfillFoundersFromPosts"}'
//   npx convex run aggregates:run '{"fn": "founders:backfillFoundersFromJobs"}'
//   npx convex run aggregates:run '{"fn": "founders:backfillFoundersFromListings"}'

// Offers created before moderation existed have no status and are active.
// Archived/closed offers are skipped: they may never have been approved.
const isApproved = (status: string | undefined) =>
  status === undefined || status === "active";

export const backfillFoundersFromPosts = migrations.define({
  table: "posts",
  migrateOne: async (ctx, doc) => {
    await grantFounderIfEligible(ctx, doc.authorId, doc._creationTime);
  },
});

export const backfillFoundersFromJobs = migrations.define({
  table: "JobOffer",
  migrateOne: async (ctx, doc) => {
    if (isApproved(doc.status)) {
      await grantFounderIfEligible(ctx, doc.authorId, doc._creationTime);
    }
  },
});

export const backfillFoundersFromListings = migrations.define({
  table: "RealestateListing",
  migrateOne: async (ctx, doc) => {
    if (isApproved(doc.status)) {
      await grantFounderIfEligible(ctx, doc.authorId, doc._creationTime);
    }
  },
});
