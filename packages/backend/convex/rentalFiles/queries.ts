import { v } from "convex/values";
import schema from "../schema";
import { env, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { authQuery } from "../functions";
import { getPublicAuthorSlug } from "../posts/publicAuthorSlug";
import {
  MAX_RENTAL_DOCUMENTS,
  rentalDocumentCategoryValidator,
  rentalProfileValidator,
} from "./values";

const MAX_LISTED_APPLICATIONS = 100;


/** The viewer's own dossier and where they sent it. */
export const getMine = authQuery({
  args: {},
  returns: v.object({
    profile: v.union(schema.doc("rentalFiles"), v.null()),
    documents: v.array(schema.doc("rentalDocuments")),
    sent: v.array(
      v.object({
        _id: v.id("rentalApplications"),
        sentAt: v.number(),
        expiresAt: v.number(),
        revoked: v.boolean(),
        listing: v.union(v.object({ title: v.string(), slug: v.string() }), v.null()),
      }),
    ),
  }),
  handler: async (ctx) => {
    const userId = ctx.user._id;
    const [profile, documents, applications] = await Promise.all([
      ctx.db
        .query("rentalFiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique(),
      ctx.db
        .query("rentalDocuments")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(MAX_RENTAL_DOCUMENTS),
      ctx.db
        .query("rentalApplications")
        .withIndex("by_candidateId", (q) => q.eq("candidateId", userId))
        .order("desc")
        .take(MAX_LISTED_APPLICATIONS),
    ]);
    const sent = await Promise.all(
      applications.map(async (application) => {
        const listing = await ctx.db.get(application.listingId);
        return {
          _id: application._id,
          sentAt: application.sentAt,
          expiresAt: application.expiresAt,
          revoked: application.revokedAt !== undefined,
          listing: listing ? { title: listing.title, slug: listing.slug } : null,
        };
      }),
    );
    return { profile, documents, sent };
  },
});

/** Whether the viewer already sent their dossier to this listing. */
export const hasSentToListing = query({
  args: { listingId: v.id("RealestateListing") },
  returns: v.boolean(),
  handler: async (ctx, { listingId }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return false;
    const application = await ctx.db
      .query("rentalApplications")
      .withIndex("by_listingId_and_candidateId", (q) =>
        q.eq("listingId", listingId).eq("candidateId", user._id),
      )
      .unique();
    return application !== null && application.revokedAt === undefined;
  },
});

/** Dossiers received for one of the viewer's listings, highlighted first. */
export const listReceived = query({
  args: { listingId: v.id("RealestateListing") },
  returns: v.union(
    v.null(),
    v.array(
      v.object({
        _id: v.id("rentalApplications"),
        candidateId: v.string(),
        candidateName: v.string(),
        candidateSlug: v.union(v.string(), v.null()),
        message: v.union(v.string(), v.null()),
        highlighted: v.boolean(),
        sentAt: v.number(),
        token: v.union(v.string(), v.null()),
      }),
    ),
  ),
  handler: async (ctx, { listingId }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    const listing = await ctx.db.get(listingId);
    if (!listing || listing.authorId !== user._id) return null;

    const applications = await ctx.db
      .query("rentalApplications")
      .withIndex("by_listingId_and_candidateId", (q) => q.eq("listingId", listingId))
      .take(MAX_LISTED_APPLICATIONS);

    const rows = await Promise.all(
      applications.map(async (application) => ({
        _id: application._id,
        candidateId: application.candidateId,
        candidateName: application.candidateName,
        candidateSlug: await getPublicAuthorSlug(ctx, application.candidateId),
        message: application.message ?? null,
        highlighted: application.highlighted,
        sentAt: application.sentAt,
        // No link once the candidate revoked access or it expired.
        token: application.revokedAt === undefined ? application.token : null,
      })),
    );
    return rows.sort(
      (a, b) => Number(b.highlighted) - Number(a.highlighted) || b.sentAt - a.sentAt,
    );
  },
});

/**
 * The dossier behind a link sent to a landlord. The token is the credential;
 * revoked or expired links (see `expireAccess`) return null.
 */
export const viewByToken = query({
  args: { token: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      candidateId: v.string(),
      candidateName: v.string(),
      highlighted: v.boolean(),
      message: v.union(v.string(), v.null()),
      sentAt: v.number(),
      expiresAt: v.number(),
      listing: v.union(v.object({ title: v.string(), slug: v.string() }), v.null()),
      profile: v.union(rentalProfileValidator, v.null()),
      documents: v.array(
        v.object({
          _id: v.id("rentalDocuments"),
          category: rentalDocumentCategoryValidator,
          fileName: v.string(),
          contentType: v.string(),
          url: v.string(),
        }),
      ),
    }),
  ),
  handler: async (ctx, { token }) => {
    if (token.length < 32 || token.length > 128) return null;
    const application = await ctx.db
      .query("rentalApplications")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!application || application.revokedAt !== undefined) return null;

    const [listing, profile, documents] = await Promise.all([
      ctx.db.get(application.listingId),
      ctx.db
        .query("rentalFiles")
        .withIndex("by_userId", (q) => q.eq("userId", application.candidateId))
        .unique(),
      ctx.db
        .query("rentalDocuments")
        .withIndex("by_userId", (q) => q.eq("userId", application.candidateId))
        .take(MAX_RENTAL_DOCUMENTS),
    ]);

    const publicProfile = profile
      ? {
          occupation: profile.occupation,
          employer: profile.employer,
          netMonthlyIncome: profile.netMonthlyIncome,
          householdSize: profile.householdSize,
          moveInDate: profile.moveInDate,
          pets: profile.pets,
          smoker: profile.smoker,
          about: profile.about,
        }
      : null;

    return {
      candidateId: application.candidateId,
      candidateName: application.candidateName,
      highlighted: application.highlighted,
      message: application.message ?? null,
      sentAt: application.sentAt,
      expiresAt: application.expiresAt,
      listing: listing ? { title: listing.title, slug: listing.slug } : null,
      profile: publicProfile,
      documents: documents.map((document) => ({
        _id: document._id,
        category: document.category,
        fileName: document.fileName,
        contentType: document.contentType,
        url: `${env.CONVEX_SITE_URL}/rental-document?t=${token}&d=${document._id}`,
      })),
    };
  },
});
