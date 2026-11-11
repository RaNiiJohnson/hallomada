import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { authComponent } from "../auth/auth";
import { authAction, internalMutation, query } from "../functions";
import { languageValidator } from "../translations/shared";
import { enforceTranslationLimits } from "../translations/security";
import { translateWithOpenAI } from "../translations/translate.lib";
import { requiresPublicationModeration } from "@hallomada/shared/publication-lifecycle";

type ListingFields = {
  title: string;
  description: string;
  city: string;
};

export const getSource = query({
  args: { id: v.id("RealestateListing") },
  handler: async (ctx, { id }) => {
    const listing = await ctx.db.get(id);
    if (!listing) return null;
    const user = await authComponent.safeGetAuthUser(ctx);
    if (
      (listing.status === "archived" ||
        requiresPublicationModeration(listing.status)) &&
      user?._id !== listing.authorId &&
      user?.role !== "admin"
    ) {
      return null;
    }
    return {
      title: listing.title,
      description: listing.description,
      city: listing.city,
      updatedAt: listing.updatedAt,
    };
  },
});

export const getTranslation = query({
  args: { listingId: v.id("RealestateListing"), language: languageValidator },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) return null;
    const user = await authComponent.safeGetAuthUser(ctx);
    if (
      (listing.status === "archived" ||
        requiresPublicationModeration(listing.status)) &&
      user?._id !== listing.authorId &&
      user?.role !== "admin"
    ) {
      return null;
    }
    return await ctx.db
      .query("listingTranslations")
      .withIndex("by_listing_language", (q) =>
        q.eq("listingId", args.listingId).eq("language", args.language),
      )
      .first();
  },
});

export const saveTranslation = internalMutation({
  args: {
    listingId: v.id("RealestateListing"),
    language: languageValidator,
    title: v.string(),
    description: v.string(),
    city: v.string(),
    sourceUpdatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("listingTranslations")
      .withIndex("by_listing_language", (q) =>
        q.eq("listingId", args.listingId).eq("language", args.language),
      )
      .first();

    if (existing) {
      if (args.sourceUpdatedAt < existing.sourceUpdatedAt) return existing._id;
      await ctx.db.patch(existing._id, {
        title: args.title,
        description: args.description,
        city: args.city,
        sourceUpdatedAt: args.sourceUpdatedAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("listingTranslations", args);
  },
});

export const translateListing = authAction({
  args: {
    listingId: v.id("RealestateListing"),
    targetLanguage: languageValidator,
  },
  returns: v.object({
    title: v.string(),
    description: v.string(),
    city: v.string(),
  }),
  handler: async (ctx, args): Promise<ListingFields> => {
    const listing = await ctx.runQuery(api.listings.translate.getSource, {
      id: args.listingId,
    });
    if (!listing) throw new Error("Listing not found");

    const cached = await ctx.runQuery(api.listings.translate.getTranslation, {
      listingId: args.listingId,
      language: args.targetLanguage,
    });
    if (cached && cached.sourceUpdatedAt === listing.updatedAt) {
      return {
        title: cached.title,
        description: cached.description,
        city: cached.city,
      };
    }

    await enforceTranslationLimits(ctx, {
      userId: ctx.user._id,
      resourceKey: `listing:${args.listingId}:${args.targetLanguage}:${listing.updatedAt}`,
    });

    const translated = await translateWithOpenAI(
      "listing",
      {
        title: listing.title,
        description: listing.description,
        city: listing.city,
      },
      args.targetLanguage,
    );

    await ctx.runMutation(internal.listings.translate.saveTranslation, {
      listingId: args.listingId,
      language: args.targetLanguage,
      title: translated.title,
      description: translated.description,
      city: translated.city,
      sourceUpdatedAt: listing.updatedAt,
    });

    return translated;
  },
});
