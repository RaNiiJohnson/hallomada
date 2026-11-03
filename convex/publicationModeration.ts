import { v } from "convex/values";
import { scheduleAlertsForPublication } from "./alerts/dispatch";
import { grantFounderIfEligible } from "./founders";
import { adminMutation, adminQuery } from "./functions";
import { hasPremium } from "./premium";
import { throwNotFound, throwValidationError } from "./utils/errors";

const moderationResourceValidator = v.union(
  v.object({ type: v.literal("job"), id: v.id("JobOffer") }),
  v.object({ type: v.literal("listing"), id: v.id("RealestateListing") }),
  v.object({ type: v.literal("provider"), id: v.id("providers") }),
);

const pendingPublicationValidator = v.union(
  v.object({
    resource: v.object({ type: v.literal("job"), id: v.id("JobOffer") }),
    title: v.string(),
    authorName: v.optional(v.string()),
    submittedAt: v.number(),
    href: v.string(),
    // Submitted by a Premium member: reviewed first.
    priority: v.boolean(),
  }),
  v.object({
    resource: v.object({
      type: v.literal("listing"),
      id: v.id("RealestateListing"),
    }),
    title: v.string(),
    authorName: v.optional(v.string()),
    submittedAt: v.number(),
    href: v.string(),
    // Submitted by a Premium member: reviewed first.
    priority: v.boolean(),
  }),
  v.object({
    resource: v.object({ type: v.literal("provider"), id: v.id("providers") }),
    title: v.string(),
    authorName: v.optional(v.string()),
    submittedAt: v.number(),
    href: v.string(),
    // Submitted by a Premium member: reviewed first.
    priority: v.boolean(),
  }),
);

export const listPending = adminQuery({
  args: {},
  returns: v.array(pendingPublicationValidator),
  handler: async (ctx) => {
    const [jobs, listings, providers] = await Promise.all([
      ctx.db
        .query("JobOffer")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .order("desc")
        .take(100),
      ctx.db
        .query("RealestateListing")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .order("desc")
        .take(100),
      ctx.db
        .query("providers")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .order("desc")
        .take(100),
    ]);

    const premiumByAuthor = new Map<string, boolean>();
    const isPriority = async (authorId: string) => {
      let premium = premiumByAuthor.get(authorId);
      if (premium === undefined) {
        premium = await hasPremium(ctx, authorId);
        premiumByAuthor.set(authorId, premium);
      }
      return premium;
    };

    const items = await Promise.all([
      ...jobs.map(async (job) => ({
        resource: { type: "job" as const, id: job._id },
        title: job.title,
        authorName: job.authorName,
        submittedAt: job.updatedAt,
        href: `/jobs/${job.slug}`,
        priority: await isPriority(job.authorId),
      })),
      ...listings.map(async (listing) => ({
        resource: { type: "listing" as const, id: listing._id },
        title: listing.title,
        authorName: listing.authorName,
        submittedAt: listing.updatedAt,
        href: `/listing/${listing.slug}`,
        priority: await isPriority(listing.authorId),
      })),
      ...providers.map(async (provider) => ({
        resource: { type: "provider" as const, id: provider._id },
        title: provider.name,
        authorName: provider.authorName,
        submittedAt: provider.updatedAt,
        href: `/providers/${provider.slug}`,
        priority: await isPriority(provider.authorId),
      })),
    ]);

    // Premium (priority) submissions first, then the usual newest first.
    return items
      .sort(
        (a, b) =>
          Number(b.priority) - Number(a.priority) || b.submittedAt - a.submittedAt,
      )
      .slice(0, 100);
  },
});

export const getPendingCount = adminQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const [jobs, listings, providers] = await Promise.all([
      ctx.db
        .query("JobOffer")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .take(100),
      ctx.db
        .query("RealestateListing")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .take(100),
      ctx.db
        .query("providers")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .take(100),
    ]);

    return jobs.length + listings.length + providers.length;
  },
});

export const decide = adminMutation({
  args: {
    resource: moderationResourceValidator,
    decision: v.union(v.literal("approved"), v.literal("rejected")),
  },
  returns: v.null(),
  handler: async (ctx, { resource, decision }) => {
    const nextStatus = decision === "approved" ? "active" : "rejected";

    if (resource.type === "job") {
      const job = await ctx.db.get(resource.id);
      if (!job) throwNotFound("Job not found");
      if (job.status !== "pending") {
        throwValidationError("This job is no longer pending moderation");
      }
      await ctx.db.patch(job._id, {
        status: nextStatus,
        updatedAt: Date.now(),
        // First publication: list it as new. Re-approvals after an edit keep
        // their place, so editing is not a free bump.
        ...(decision === "approved" && job.alertsSentAt === undefined
          ? { listedAt: Date.now() }
          : {}),
      });
      if (decision === "approved") {
        await grantFounderIfEligible(ctx, job.authorId);
        await scheduleAlertsForPublication(ctx, { kind: "job", doc: job });
      }
      await ctx.db.insert("notifications", {
        userId: job.authorId,
        type: decision === "approved" ? "job_approved" : "job_rejected",
        read: false,
        message: job.title,
        targetHref: `/jobs/${job.slug}`,
      });
      return null;
    }

    if (resource.type === "provider") {
      const provider = await ctx.db.get(resource.id);
      if (!provider) throwNotFound("Provider not found");
      if (provider.status !== "pending") {
        throwValidationError("This provider page is no longer pending moderation");
      }
      await ctx.db.patch(provider._id, {
        status: nextStatus,
        updatedAt: Date.now(),
      });
      await ctx.db.insert("notifications", {
        userId: provider.authorId,
        type:
          decision === "approved" ? "provider_approved" : "provider_rejected",
        read: false,
        message: provider.name,
        targetHref: `/providers/${provider.slug}`,
      });
      return null;
    }

    const listing = await ctx.db.get(resource.id);
    if (!listing) throwNotFound("Listing not found");
    if (listing.status !== "pending") {
      throwValidationError("This listing is no longer pending moderation");
    }
    await ctx.db.patch(listing._id, {
      status: nextStatus,
      updatedAt: Date.now(),
      ...(decision === "approved" && listing.alertsSentAt === undefined
        ? { listedAt: Date.now() }
        : {}),
    });
    if (decision === "approved") {
      await grantFounderIfEligible(ctx, listing.authorId);
      await scheduleAlertsForPublication(ctx, { kind: "listing", doc: listing });
    }
    await ctx.db.insert("notifications", {
      userId: listing.authorId,
      type:
        decision === "approved" ? "listing_approved" : "listing_rejected",
      read: false,
      message: listing.title,
      targetHref: `/listing/${listing.slug}`,
    });
    return null;
  },
});
