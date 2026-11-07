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
  job: { name: "createJobPerUser", field: "jobsPerWeek", period: 7 * DAY },
  listing: {
    name: "createListingPerUser",
    field: "listingsPerWeek",
    period: 7 * DAY,
  },
  provider: {
    name: "createProviderPerUser",
    field: "providersPerMonth",
    period: 30 * DAY,
  },
} as const;

export type PublicationQuotaKind = keyof typeof QUOTA_LIMITS;

const planQuotasValidator = v.object({
  jobsPerWeek: v.number(),
  listingsPerWeek: v.number(),
  providersPerMonth: v.number(),
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
    result[row.plan] = {
      jobsPerWeek: row.jobsPerWeek,
      listingsPerWeek: row.listingsPerWeek,
      providersPerMonth: row.providersPerMonth,
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
 * Runs inside the caller's mutation, so a later failure rolls it back.
 */
export async function consumePublicationQuota(
  ctx: MutationCtx,
  kind: PublicationQuotaKind,
  userId: string,
) {
  const { name, field, period } = QUOTA_LIMITS[kind];
  const plan: QuotaPlan = (await hasPremium(ctx, userId)) ? "premium" : "free";
  const quotas = (await getAllQuotas(ctx))[plan];
  const rate = await limiter.limit(ctx, name, {
    key: userId,
    config: { kind: "fixed window", rate: quotas[field], period },
  });
  if (!rate.ok) {
    throwLimitReached("Publication quota reached", {
      quota: kind,
      limit: quotas[field],
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
    jobsPerWeek: v.number(),
    listingsPerWeek: v.number(),
    providersPerMonth: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { plan, ...values }) => {
    for (const value of Object.values(values)) {
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
