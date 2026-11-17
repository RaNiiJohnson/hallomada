import { DAY } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { authComponent } from "./auth/auth";
import { hasPremium } from "./premium";
import { getAllQuotas } from "./publicationQuotas";
import { throwLimitReached } from "./utils/errors";

/** Rolling window: an application counts for 30 days after it was sent. */
export const APPLICATION_QUOTA_PERIOD = 30 * DAY;

export type ApplicationUsage = {
  /** `null` = unlimited (Premium, or an administrator choice). */
  limit: number | null;
  used: number;
  /** `null` = unlimited. */
  remaining: number | null;
  /** When the next credit frees up; `null` while credits remain. */
  resetsAt: number | null;
};

/**
 * Counts the member's job applications and rental dossiers sent in the last
 * 30 days. Both tables are the source of truth, so there is no separate
 * counter to keep in sync (and nothing to refund by hand).
 */
export async function getApplicationUsage(
  ctx: QueryCtx,
  userId: string,
  now: number,
): Promise<ApplicationUsage> {
  const plan = (await hasPremium(ctx, userId)) ? "premium" : "free";
  const limit = (await getAllQuotas(ctx))[plan].applicationsPerMonth;
  if (limit === null) {
    return { limit, used: 0, remaining: null, resetsAt: null };
  }

  const since = now - APPLICATION_QUOTA_PERIOD;
  // Newest first, and never more than `limit` rows from each table: enough to
  // know whether the limit is reached.
  const jobs = await ctx.db
    .query("jobApplications")
    .withIndex("by_candidateId_and_appliedAt", (q) =>
      q.eq("candidateId", userId).gte("appliedAt", since),
    )
    .order("desc")
    .take(limit);
  const dossiers = await ctx.db
    .query("rentalApplications")
    .withIndex("by_candidateId_and_sentAt", (q) =>
      q.eq("candidateId", userId).gte("sentAt", since),
    )
    .order("desc")
    .take(limit);

  const sentAt = [
    ...jobs.map((row) => row.appliedAt),
    ...dossiers.map((row) => row.sentAt),
  ].sort((a, b) => b - a);
  const used = Math.min(sentAt.length, limit);
  const remaining = Math.max(limit - used, 0);
  // The credit that frees up first is the oldest of the `limit` newest ones.
  const resetsAt =
    remaining === 0
      ? sentAt[limit - 1] + APPLICATION_QUOTA_PERIOD
      : null;
  return { limit, used, remaining, resetsAt };
}

/** Throws `LIMIT_REACHED` when the member has no application left. */
export async function assertApplicationQuota(
  ctx: MutationCtx,
  userId: string,
) {
  const usage = await getApplicationUsage(ctx, userId, Date.now());
  if (usage.remaining === 0 && usage.limit !== null) {
    throwLimitReached("Monthly application quota reached", {
      quota: "application",
      limit: usage.limit,
      resetsAt: usage.resetsAt ?? 0,
    });
  }
}

/**
 * The viewer's remaining applications, for the counter next to the buttons.
 * `now` comes from the client because queries must not read the clock.
 */
export const getMine = query({
  args: { now: v.number() },
  returns: v.union(
    v.null(),
    v.object({
      limit: v.union(v.number(), v.null()),
      used: v.number(),
      remaining: v.union(v.number(), v.null()),
      resetsAt: v.union(v.number(), v.null()),
    }),
  ),
  handler: async (ctx, { now }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    return await getApplicationUsage(ctx, user._id, now);
  },
});
