import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { adminMutation, adminQuery } from "./functions";
import { MAX_FOUNDERS } from "./foundersValues";

/**
 * "Membre fondateur" badge, numbered ("Fondateur n° 23").
 *
 * Rules: the first MAX_FOUNDERS members whose job offer or real estate listing
 * is approved by moderation, while the program is open, earn the badge. The
 * badge is permanent. Administrators can also grant or remove it by hand
 * (manual grants may exceed the limit), and close the program with
 * `closesAt`, typically the day paid Premium launches.
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

export async function isFounderUser(ctx: QueryCtx, userId: string) {
  return (await findFounder(ctx, userId)) !== null;
}

async function nextNumber(ctx: QueryCtx) {
  const last = await ctx.db.query("founders").withIndex("by_number").order("desc").first();
  return (last?.number ?? 0) + 1;
}

async function founderCount(ctx: QueryCtx) {
  return (await ctx.db.query("founders").take(MAX_FOUNDERS)).length;
}

/**
 * Called when moderation approves a member's job offer or listing. Grants the
 * next number if the member has no badge yet, the program is open and places
 * are left. Runs inside the caller's mutation.
 */
export async function grantFounderIfEligible(
  ctx: MutationCtx,
  userId: string,
  publishedAt: number = Date.now(),
) {
  if (await findFounder(ctx, userId)) return;
  const closesAt = await getClosesAt(ctx);
  if (closesAt !== null && publishedAt >= closesAt) return;
  if ((await founderCount(ctx)) >= MAX_FOUNDERS) return;
  await ctx.db.insert("founders", {
    userId,
    since: publishedAt,
    number: await nextNumber(ctx),
    source: "auto",
  });
}

const founderValidator = v.union(
  v.null(),
  v.object({ number: v.union(v.number(), v.null()) }),
);

/** The member's founder badge, or null. Public: the badge is public. */
export const getFounder = query({
  args: { userId: v.string() },
  returns: founderValidator,
  handler: async (ctx, { userId }) => {
    const founder = await findFounder(ctx, userId);
    return founder ? { number: founder.number ?? null } : null;
  },
});

export const getProgram = adminQuery({
  args: {},
  returns: v.object({
    closesAt: v.union(v.number(), v.null()),
    count: v.number(),
    max: v.number(),
  }),
  handler: async (ctx) => ({
    closesAt: await getClosesAt(ctx),
    count: (await ctx.db.query("founders").take(MAX_FOUNDERS * 2)).length,
    max: MAX_FOUNDERS,
  }),
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

/** Admin: give the badge by hand (takes the next number, even past the limit). */
export const grantFounder = adminMutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    if (await findFounder(ctx, userId)) return null;
    await ctx.db.insert("founders", {
      userId,
      since: Date.now(),
      number: await nextNumber(ctx),
      source: "manual",
      grantedBy: ctx.user._id,
    });
    return null;
  },
});

/** Admin: remove the badge. Its number is not given to anyone else. */
export const revokeFounder = adminMutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const founder = await findFounder(ctx, userId);
    if (founder) await ctx.db.delete(founder._id);
    return null;
  },
});

// ---- recompute after the rules changed ----
// Run once per deployment (keeps manual grants, recomputes the others):
//   npx convex run founders:rebuildFounders

const SCAN_LIMIT = 5000;

/** Approved at least once: active, or published before moderation existed. */
function wasApproved(doc: Doc<"JobOffer"> | Doc<"RealestateListing">) {
  return doc.status === undefined || doc.status === "active" || doc.alertsSentAt !== undefined;
}

export const rebuildFounders = internalMutation({
  args: {},
  returns: v.object({ founders: v.number(), manual: v.number() }),
  handler: async (ctx) => {
    const existing = await ctx.db.query("founders").take(SCAN_LIMIT);
    const manual = existing.filter((founder) => founder.source === "manual");
    for (const founder of existing) {
      if (founder.source !== "manual") await ctx.db.delete(founder._id);
    }

    const closesAt = await getClosesAt(ctx);
    const firstApproval = new Map<string, number>();
    const consider = (doc: Doc<"JobOffer"> | Doc<"RealestateListing">) => {
      if (!wasApproved(doc)) return;
      const at = doc.listedAt ?? doc._creationTime;
      if (closesAt !== null && at >= closesAt) return;
      const previous = firstApproval.get(doc.authorId);
      if (previous === undefined || at < previous) firstApproval.set(doc.authorId, at);
    };
    for (const job of await ctx.db.query("JobOffer").take(SCAN_LIMIT)) consider(job);
    for (const listing of await ctx.db.query("RealestateListing").take(SCAN_LIMIT)) consider(listing);

    const manualIds = new Set(manual.map((founder) => founder.userId));
    const usedNumbers = new Set(manual.map((founder) => founder.number));
    const candidates = [...firstApproval.entries()]
      .filter(([userId]) => !manualIds.has(userId))
      .sort((a, b) => a[1] - b[1]);

    let number = 1;
    let total = manual.length;
    for (const [userId, since] of candidates) {
      if (total >= MAX_FOUNDERS) break;
      while (usedNumbers.has(number)) number++;
      await ctx.db.insert("founders", { userId, since, number, source: "auto" });
      usedNumbers.add(number);
      total++;
    }
    return { founders: total, manual: manual.length };
  },
});
