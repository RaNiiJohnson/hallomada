import { DAY } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { adminMutation, adminQuery } from "./functions";
import { limiter } from "./rateLimits";
import { throwLimitReached, throwValidationError } from "./utils/errors";

export const DEFAULT_PUBLICATION_QUOTAS = {
  communityPer30Days: 1,
  jobsPerWeek: 3,
  listingsPerWeek: 3,
};

export const MAX_PUBLICATION_QUOTA = 100;

export type PublicationQuotas = typeof DEFAULT_PUBLICATION_QUOTAS;

const QUOTA_LIMITS = {
  community: {
    name: "createCommunityPerUser",
    field: "communityPer30Days",
    period: 30 * DAY,
  },
  job: { name: "createJobPerUser", field: "jobsPerWeek", period: 7 * DAY },
  listing: {
    name: "createListingPerUser",
    field: "listingsPerWeek",
    period: 7 * DAY,
  },
} as const;

export type PublicationQuotaKind = keyof typeof QUOTA_LIMITS;

export async function getPublicationQuotas(
  ctx: QueryCtx,
): Promise<PublicationQuotas> {
  const row = await ctx.db.query("publicationQuotas").first();
  if (!row) return DEFAULT_PUBLICATION_QUOTAS;
  return {
    communityPer30Days: row.communityPer30Days,
    jobsPerWeek: row.jobsPerWeek,
    listingsPerWeek: row.listingsPerWeek,
  };
}

// Names are deliberately absent from `rateLimits.ts`: the rate-limiter client
// only accepts a per-call `config` for names it does not know statically, and
// the effective rate comes from the administrator-editable `publicationQuotas`.
/**
 * Consumes one unit of the user's publication quota, or throws
 * `LIMIT_REACHED`. Runs inside the caller's mutation, so a later failure
 * rolls the consumption back. The limit is enforced server-side with the
 * values currently configured by administrators.
 */
export async function consumePublicationQuota(
  ctx: MutationCtx,
  kind: PublicationQuotaKind,
  userId: string,
) {
  const { name, field, period } = QUOTA_LIMITS[kind];
  const quotas = await getPublicationQuotas(ctx);
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

const quotaValue = v.number();

export const get = adminQuery({
  args: {},
  returns: v.object({
    communityPer30Days: v.number(),
    jobsPerWeek: v.number(),
    listingsPerWeek: v.number(),
  }),
  handler: async (ctx) => await getPublicationQuotas(ctx),
});

export const update = adminMutation({
  args: {
    communityPer30Days: quotaValue,
    jobsPerWeek: quotaValue,
    listingsPerWeek: quotaValue,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const value of [
      args.communityPer30Days,
      args.jobsPerWeek,
      args.listingsPerWeek,
    ]) {
      if (!Number.isInteger(value) || value < 1 || value > MAX_PUBLICATION_QUOTA) {
        throwValidationError(
          `Quotas must be whole numbers between 1 and ${MAX_PUBLICATION_QUOTA}`,
        );
      }
    }
    const next = {
      ...args,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    };
    const existing = await ctx.db.query("publicationQuotas").first();
    if (existing) await ctx.db.patch(existing._id, next);
    else await ctx.db.insert("publicationQuotas", next);
    return null;
  },
});
