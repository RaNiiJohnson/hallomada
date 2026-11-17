import { v } from "convex/values";
import { internal } from "../_generated/api";
import { assertApplicationQuota } from "../applicationQuotas";
import { httpAction, internalMutation, internalQuery } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { r2 } from "../integrations/r2";
import { generateCvToken } from "../jobs/applicationCv";
import { hasHighlight } from "../premium";
import { limiter } from "../rateLimits";
import {
  throwForbidden,
  throwLimitReached,
  throwNotFound,
  throwValidationError,
} from "../utils/errors";
import { MAX_RENTAL_MESSAGE, RENTAL_ACCESS_MS } from "./values";

const SIGNED_URL_SECONDS = 5 * 60;
const EXPIRE_BATCH = 100;

export const submit = internalMutation({
  args: {
    listingId: v.id("RealestateListing"),
    message: v.optional(v.string()),
  },
  returns: v.object({
    token: v.string(),
    listingTitle: v.string(),
    authorId: v.string(),
    contactEmail: v.optional(v.string()),
    candidateName: v.string(),
    message: v.optional(v.string()),
    highlighted: v.boolean(),
  }),
  handler: async (ctx, { listingId, message }) => {
    const candidate = await authComponent.safeGetAuthUser(ctx);
    if (!candidate) throwForbidden("Authentication required");
    const candidateId = candidate._id;

    const trimmedMessage = message?.trim() || undefined;
    if (trimmedMessage && trimmedMessage.length > MAX_RENTAL_MESSAGE) {
      throwValidationError("Message is too long");
    }

    const listing = await ctx.db.get(listingId);
    if (!listing) throwNotFound("Listing not found");
    if (listing.status !== undefined && listing.status !== "active") {
      throwValidationError("This listing is no longer available");
    }
    if (listing.listingMode !== "rent" || listing.acceptsRentalFile !== true) {
      throwValidationError("This listing does not ask for a rental dossier");
    }
    if (listing.authorId === candidateId) {
      throwForbidden("You cannot send your dossier to your own listing");
    }

    const document = await ctx.db
      .query("rentalDocuments")
      .withIndex("by_userId", (q) => q.eq("userId", candidateId))
      .first();
    if (!document) throwValidationError("Your dossier has no documents yet");

    const existing = await ctx.db
      .query("rentalApplications")
      .withIndex("by_listingId_and_candidateId", (q) =>
        q.eq("listingId", listingId).eq("candidateId", candidateId),
      )
      .unique();
    if (existing && existing.revokedAt === undefined) {
      throwValidationError("You have already sent your dossier for this listing");
    }

    // Free members: shared monthly quota with job applications.
    await assertApplicationQuota(ctx, candidateId);

    const rate = await limiter.limit(ctx, "rentalFilePerUser", { key: candidateId });
    if (!rate.ok) {
      throwLimitReached("Daily dossier limit reached", {
        retryAfter: rate.retryAfter ?? 0,
      });
    }

    const now = Date.now();
    const token = generateCvToken();
    const highlighted = await hasHighlight(ctx, candidateId);
    const row = {
      listingId,
      candidateId,
      candidateName: candidate.name,
      message: trimmedMessage,
      highlighted,
      token,
      sentAt: now,
      expiresAt: now + RENTAL_ACCESS_MS,
      revokedAt: undefined,
    };
    if (existing) await ctx.db.replace(existing._id, row);
    else await ctx.db.insert("rentalApplications", row);

    await ctx.db.insert("notifications", {
      userId: listing.authorId,
      type: "rental_file_received",
      read: false,
      fromUserName: candidate.name,
      message: listing.title,
      targetHref: `/listing/${listing.slug}`,
    });

    const contact = await ctx.db
      .query("RealestateContactInfo")
      .withIndex("by_listingId", (q) => q.eq("listingId", listingId))
      .unique();

    return {
      token,
      listingTitle: listing.title,
      authorId: listing.authorId,
      contactEmail: contact?.email || undefined,
      candidateName: candidate.name,
      message: trimmedMessage,
      highlighted,
    };
  },
});

/** Ends access to dossiers whose access window has passed. */
export const expireAccess = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("rentalApplications")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .take(EXPIRE_BATCH);
    let changed = 0;
    for (const application of expired) {
      if (application.revokedAt !== undefined) continue;
      await ctx.db.patch(application._id, { revokedAt: application.expiresAt });
      changed++;
    }
    if (changed > 0 && expired.length === EXPIRE_BATCH) {
      await ctx.scheduler.runAfter(0, internal.rentalFiles.send.expireAccess, {});
    }
    return null;
  },
});

export const resolveDocument = internalQuery({
  args: { token: v.string(), documentId: v.string() },
  returns: v.union(v.object({ key: v.string() }), v.null()),
  handler: async (ctx, { token, documentId }) => {
    const application = await ctx.db
      .query("rentalApplications")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (
      !application ||
      application.revokedAt !== undefined ||
      application.expiresAt <= Date.now()
    ) {
      return null;
    }
    const id = ctx.db.normalizeId("rentalDocuments", documentId);
    const document = id ? await ctx.db.get(id) : null;
    if (!document || document.userId !== application.candidateId) return null;
    return { key: document.key };
  },
});

/**
 * `GET /rental-document?t=<token>&d=<documentId>`: the token from the link the
 * landlord received is the only credential. Redirects to a short-lived URL.
 */
export const downloadRentalDocument = httpAction(async (ctx, req) => {
  const params = new URL(req.url).searchParams;
  const token = params.get("t");
  const documentId = params.get("d");
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex",
  };
  if (!token || token.length < 32 || token.length > 128 || !documentId) {
    return new Response("Not found", { status: 404, headers });
  }
  const result = await ctx.runQuery(internal.rentalFiles.send.resolveDocument, {
    token,
    documentId,
  });
  if (!result) {
    return new Response("This link is no longer available.", { status: 410, headers });
  }
  const url = await r2.getUrl(result.key, { expiresIn: SIGNED_URL_SECONDS });
  return new Response(null, { status: 302, headers: { ...headers, Location: url } });
});
