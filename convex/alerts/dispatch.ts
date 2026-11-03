import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { matchesKeywords, normalizeCity } from "./values";

/**
 * Search alerts: when a job offer or a listing is approved by moderation,
 * every member whose alert matches it gets an in-app notification and,
 * if they asked for it, an email. Alerts go out once per publication.
 */

const BATCH_SIZE = 100;

type Publication =
  | { kind: "listing"; doc: Doc<"RealestateListing"> }
  | { kind: "job"; doc: Doc<"JobOffer"> };

/** Called from the moderation decision, inside its transaction. */
export async function scheduleAlertsForPublication(
  ctx: MutationCtx,
  publication: Publication,
) {
  const { kind, doc } = publication;
  if (doc.alertsSentAt !== undefined) return;
  const now = Date.now();
  if (kind === "listing") {
    await ctx.db.patch(doc._id, { alertsSentAt: now });
  } else {
    await ctx.db.patch(doc._id, { alertsSentAt: now });
  }
  const cityKey = normalizeCity(doc.city);
  await ctx.scheduler.runAfter(0, internal.alerts.dispatch.matchBatch, {
    kind,
    resourceId: doc._id,
    // Alerts for a specific city first, then alerts for any city.
    cityKey,
    phase: cityKey === "" ? "any" : "city",
    paginationOpts: { numItems: BATCH_SIZE, cursor: null },
  });
}

export function alertMatches(alert: Doc<"alerts">, publication: Publication) {
  if (alert.kind !== publication.kind) return false;
  if (publication.kind === "listing") {
    const listing = publication.doc;
    if (alert.listingMode && alert.listingMode !== listing.listingMode) return false;
    if (alert.propertyType && alert.propertyType !== listing.propertyType) return false;
    if (alert.maxPrice !== undefined && listing.price > alert.maxPrice) return false;
    return matchesKeywords(
      alert.keywords,
      `${listing.title} ${listing.city} ${listing.neighborhood ?? ""} ${listing.description}`,
    );
  }
  const job = publication.doc;
  if (alert.jobType && alert.jobType !== job.type) return false;
  if (alert.workMode && alert.workMode !== job.workMode) return false;
  return matchesKeywords(
    alert.keywords,
    `${job.title} ${job.company} ${job.city} ${job.sector ?? ""} ${job.description}`,
  );
}

async function loadPublication(
  ctx: MutationCtx,
  kind: "listing" | "job",
  resourceId: string,
): Promise<Publication | null> {
  if (kind === "listing") {
    const id = ctx.db.normalizeId("RealestateListing", resourceId);
    const doc = id ? await ctx.db.get(id) : null;
    return doc ? { kind, doc } : null;
  }
  const id = ctx.db.normalizeId("JobOffer", resourceId);
  const doc = id ? await ctx.db.get(id) : null;
  return doc ? { kind, doc } : null;
}

export const matchBatch = internalMutation({
  args: {
    kind: v.union(v.literal("listing"), v.literal("job")),
    resourceId: v.string(),
    cityKey: v.string(),
    phase: v.union(v.literal("city"), v.literal("any")),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const publication = await loadPublication(ctx, args.kind, args.resourceId);
    // Withdrawn or deleted in the meantime: nobody needs to hear about it.
    if (!publication || publication.doc.status !== "active") return null;

    const phaseCityKey = args.phase === "city" ? args.cityKey : "";
    const result = await ctx.db
      .query("alerts")
      .withIndex("by_kind_and_cityKey", (q) =>
        q.eq("kind", args.kind).eq("cityKey", phaseCityKey),
      )
      .paginate(args.paginationOpts);

    const resourceKey = `${args.kind}:${args.resourceId}`;
    for (const alert of result.page) {
      if (alert.paused) continue;
      if (alert.userId === publication.doc.authorId) continue;
      if (!alertMatches(alert, publication)) continue;
      await deliver(ctx, alert, publication, resourceKey);
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, internal.alerts.dispatch.matchBatch, {
        ...args,
        paginationOpts: {
          numItems: args.paginationOpts.numItems,
          cursor: result.continueCursor,
        },
      });
    } else if (args.phase === "city") {
      await ctx.scheduler.runAfter(0, internal.alerts.dispatch.matchBatch, {
        ...args,
        phase: "any",
        paginationOpts: { numItems: args.paginationOpts.numItems, cursor: null },
      });
    }
    return null;
  },
});

async function deliver(
  ctx: MutationCtx,
  alert: Doc<"alerts">,
  publication: Publication,
  resourceKey: string,
) {
  const already = await ctx.db
    .query("alertDeliveries")
    .withIndex("by_resourceKey_and_userId", (q) =>
      q.eq("resourceKey", resourceKey).eq("userId", alert.userId),
    )
    .unique();
  if (already) return;
  await ctx.db.insert("alertDeliveries", { resourceKey, userId: alert.userId });

  const { doc } = publication;
  const path =
    publication.kind === "listing" ? `/listing/${doc.slug}` : `/jobs/${doc.slug}`;
  await ctx.db.insert("notifications", {
    userId: alert.userId,
    type: publication.kind === "listing" ? "alert_listing" : "alert_job",
    read: false,
    message: doc.title,
    targetHref: path,
  });

  if (alert.email) {
    await ctx.scheduler.runAfter(0, internal.alerts.emails.sendAlertEmail, {
      userId: alert.userId,
      alertId: alert._id,
      locale: alert.locale,
      kind: publication.kind,
      title: doc.title,
      city: doc.city,
      path,
      price: publication.kind === "listing" ? publication.doc.price : undefined,
      company: publication.kind === "job" ? publication.doc.company : undefined,
    });
  }
}
