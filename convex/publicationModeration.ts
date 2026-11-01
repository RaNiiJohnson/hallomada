import { v } from "convex/values";
import { adminMutation, adminQuery } from "./functions";
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
  }),
  v.object({
    resource: v.object({ type: v.literal("provider"), id: v.id("providers") }),
    title: v.string(),
    authorName: v.optional(v.string()),
    submittedAt: v.number(),
    href: v.string(),
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

    return [
      ...jobs.map((job) => ({
        resource: { type: "job" as const, id: job._id },
        title: job.title,
        authorName: job.authorName,
        submittedAt: job.updatedAt,
        href: `/jobs/${job.slug}`,
      })),
      ...listings.map((listing) => ({
        resource: { type: "listing" as const, id: listing._id },
        title: listing.title,
        authorName: listing.authorName,
        submittedAt: listing.updatedAt,
        href: `/listing/${listing.slug}`,
      })),
      ...providers.map((provider) => ({
        resource: { type: "provider" as const, id: provider._id },
        title: provider.name,
        authorName: provider.authorName,
        submittedAt: provider.updatedAt,
        href: `/providers/${provider.slug}`,
      })),
    ]
      .sort((a, b) => b.submittedAt - a.submittedAt)
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
      await ctx.db.patch(job._id, { status: nextStatus, updatedAt: Date.now() });
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
    });
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
