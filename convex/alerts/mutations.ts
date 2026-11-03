import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { authMutation } from "../functions";
import {
  throwForbidden,
  throwLimitReached,
  throwNotFound,
  throwValidationError,
} from "../utils/errors";
import {
  alertCriteriaValidator,
  alertLocaleValidator,
  MAX_ALERT_CITY_LENGTH,
  MAX_ALERT_KEYWORDS_LENGTH,
  MAX_ALERT_PRICE,
  MAX_ALERTS_PER_USER,
  normalizeCity,
} from "./values";

export const create = authMutation({
  args: {
    criteria: alertCriteriaValidator,
    // false saves the search without notifications.
    notify: v.optional(v.boolean()),
    email: v.boolean(),
    locale: alertLocaleValidator,
  },
  returns: v.id("alerts"),
  handler: async (ctx, { criteria, notify = true, email, locale }) => {
    const userId = ctx.user._id;
    const existing = await ctx.db
      .query("alerts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(MAX_ALERTS_PER_USER);
    if (existing.length >= MAX_ALERTS_PER_USER) {
      throwLimitReached("Alert limit reached", {
        limit: MAX_ALERTS_PER_USER,
      });
    }

    const city = criteria.city?.trim() || undefined;
    if (city && city.length > MAX_ALERT_CITY_LENGTH) {
      throwValidationError("City is too long");
    }

    const keywords = criteria.keywords?.trim().replace(/\s+/g, " ") || undefined;
    if (keywords && keywords.length > MAX_ALERT_KEYWORDS_LENGTH) {
      throwValidationError("Keywords are too long");
    }

    const base = {
      userId,
      keywords,
      cityKey: normalizeCity(city),
      city,
      email,
      paused: !notify,
      locale,
    };

    if (criteria.kind === "listing") {
      const { maxPrice } = criteria;
      if (
        maxPrice !== undefined &&
        (!Number.isFinite(maxPrice) || maxPrice <= 0 || maxPrice > MAX_ALERT_PRICE)
      ) {
        throwValidationError("Invalid maximum price");
      }
      return await ctx.db.insert("alerts", {
        ...base,
        kind: "listing",
        listingMode: criteria.listingMode,
        propertyType: criteria.propertyType,
        maxPrice,
      });
    }

    return await ctx.db.insert("alerts", {
      ...base,
      kind: "job",
      jobType: criteria.jobType,
      workMode: criteria.workMode,
    });
  },
});

async function getOwnAlert(
  ctx: Pick<MutationCtx, "db">,
  id: Id<"alerts">,
  userId: string,
) {
  const alert = await ctx.db.get(id);
  if (!alert) throwNotFound("Alert not found");
  if (alert.userId !== userId) throwForbidden();
  return alert;
}

export const update = authMutation({
  args: {
    id: v.id("alerts"),
    paused: v.optional(v.boolean()),
    email: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { id, paused, email }) => {
    await getOwnAlert(ctx, id, ctx.user._id);
    await ctx.db.patch(id, {
      ...(paused !== undefined ? { paused } : {}),
      ...(email !== undefined ? { email } : {}),
    });
    return null;
  },
});

export const remove = authMutation({
  args: { id: v.id("alerts") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await getOwnAlert(ctx, id, ctx.user._id);
    await ctx.db.delete(id);
    return null;
  },
});
