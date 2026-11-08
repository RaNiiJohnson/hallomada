import { DAY } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { adminMutation, adminQuery } from "./functions";
import { hasPremium } from "./premium";
import {
  DEFAULT_PLAN_QUOTAS,
  MAX_PUBLICATION_QUOTA,
  type PlanQuotas,
  type QuotaPlan,
} from "./publicationQuotaValues";
import { limiter } from "./rateLimits";
import { throwLimitReached, throwValidationError } from "./utils/errors";

export { DEFAULT_PLAN_QUOTAS, MAX_PUBLICATION_QUOTA };
export type { PlanQuotas, QuotaPlan };

const QUOTA_LIMITS = {
  job: { name: "createJobPerUser", field: "jobsPerMonth" },
  listing: { name: "createListingPerUser", field: "listingsPerMonth" },
  provider: { name: "createProviderPerUser", field: "providersPerMonth" },
} as const;

const QUOTA_PERIOD = 30 * DAY;

export type PublicationQuotaKind = keyof typeof QUOTA_LIMITS;

const quotaValueValidator = v.union(v.number(), v.null());

const planQuotasValidator = v.object({
  jobsPerMonth: quotaValueValidator,
  listingsPerMonth: quotaValueValidator,
  providersPerMonth: quotaValueValidator,
});

const allQuotasValidator = v.object({
  free: planQuotasValidator,
  premium: planQuotasValidator,
});

const planValidator = v.union(v.literal("free"), v.literal("premium"));

export async function getAllQuotas(
  ctx: QueryCtx,
): Promise<Record<QuotaPlan, PlanQuotas>> {
  const rows = await ctx.db.query("planQuotas").take(10);
  const result = {
    free: { ...DEFAULT_PLAN_QUOTAS.free },
    premium: { ...DEFAULT_PLAN_QUOTAS.premium },
  };
  for (const row of rows) {
    // `null` is a real value (unlimited), so only a missing field falls back.
    const pick = (value: number | null | undefined, fallback: number | null) =>
      value === undefined ? fallback : value;
    const defaults = DEFAULT_PLAN_QUOTAS[row.plan];
    result[row.plan] = {
      jobsPerMonth: pick(row.jobsPerMonth, defaults.jobsPerMonth),
      listingsPerMonth: pick(row.listingsPerMonth, defaults.listingsPerMonth),
      providersPerMonth: pick(row.providersPerMonth, defaults.providersPerMonth),
    };
  }
  return result;
}

// Names are deliberately absent from `rateLimits.ts`: the rate-limiter client
// only accepts a per-call `config` for names it does not know statically, and
// the effective rate comes from the administrator-editable `planQuotas`.
/**
 * Consumes one unit of the user's publication quota, or throws
 * `LIMIT_REACHED`. The numbers depend on the member's plan (Free or Premium).
 * Every publication first passes the short anti-burst bucket; the monthly
 * quota then applies unless the plan's number is unlimited (`null`).
 * Runs inside the caller's mutation, so a later failure rolls it back.
 */
export async function consumePublicationQuota(
  ctx: MutationCtx,
  kind: PublicationQuotaKind,
  userId: string,
) {
  const { name, field } = QUOTA_LIMITS[kind];
  const plan: QuotaPlan = (await hasPremium(ctx, userId)) ? "premium" : "free";
  const limit = (await getAllQuotas(ctx))[plan][field];

  const burst = await limiter.limit(ctx, "publicationBurstPerUser", {
    key: userId,
  });
  if (!burst.ok) {
    throwLimitReached("Publication rate limit reached", {
      quota: kind,
      retryAfter: burst.retryAfter ?? 0,
    });
  }

  if (limit === null) return;
  const rate = await limiter.limit(ctx, name, {
    key: userId,
    config: { kind: "fixed window", rate: limit, period: QUOTA_PERIOD },
  });
  if (!rate.ok) {
    throwLimitReached("Publication quota reached", {
      quota: kind,
      limit,
      retryAfter: rate.retryAfter ?? 0,
    });
  }
}

/** Both plans' numbers, for the admin form. */
export const get = adminQuery({
  args: {},
  returns: allQuotasValidator,
  handler: async (ctx) => await getAllQuotas(ctx),
});

/** Both plans' numbers, shown on the pricing page (not sensitive). */
export const getPublic = query({
  args: {},
  returns: allQuotasValidator,
  handler: async (ctx) => await getAllQuotas(ctx),
});

export const update = adminMutation({
  args: {
    plan: planValidator,
    jobsPerMonth: quotaValueValidator,
    listingsPerMonth: quotaValueValidator,
    providersPerMonth: quotaValueValidator,
  },
  returns: v.null(),
  handler: async (ctx, { plan, ...values }) => {
    for (const value of Object.values(values)) {
      if (value === null) continue; // illimité
      if (!Number.isInteger(value) || value < 1 || value > MAX_PUBLICATION_QUOTA) {
        throwValidationError(
          `Quotas must be whole numbers between 1 and ${MAX_PUBLICATION_QUOTA}`,
        );
      }
    }
    const next = { plan, ...values, updatedAt: Date.now(), updatedBy: ctx.user._id };
    const existing = await ctx.db
      .query("planQuotas")
      .withIndex("by_plan", (q) => q.eq("plan", plan))
      .unique();
    if (existing) await ctx.db.patch(existing._id, next);
    else await ctx.db.insert("planQuotas", next);
    return null;
  },
});
