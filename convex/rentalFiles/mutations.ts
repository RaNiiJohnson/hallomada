import { v } from "convex/values";
import { authMutation } from "../functions";
import {
  assertVerifiedUpload,
  consumeUploadGrant,
  r2,
} from "../integrations/r2";
import {
  throwForbidden,
  throwLimitReached,
  throwNotFound,
  throwValidationError,
} from "../utils/errors";
import {
  MAX_HOUSEHOLD_SIZE,
  MAX_RENTAL_ABOUT,
  MAX_RENTAL_DOCUMENTS,
  MAX_RENTAL_FILE_NAME,
  MAX_RENTAL_INCOME,
  MAX_RENTAL_TEXT,
  rentalDocumentCategoryValidator,
  rentalProfileValidator,
} from "./values";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(value: string | undefined, max: number, field: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > max) throwValidationError(`${field} is too long`);
  return trimmed;
}

export const saveProfile = authMutation({
  args: { profile: rentalProfileValidator },
  returns: v.null(),
  handler: async (ctx, { profile }) => {
    const { netMonthlyIncome, householdSize, moveInDate } = profile;
    if (
      netMonthlyIncome !== undefined &&
      (!Number.isFinite(netMonthlyIncome) ||
        netMonthlyIncome < 0 ||
        netMonthlyIncome > MAX_RENTAL_INCOME)
    ) {
      throwValidationError("Invalid income");
    }
    if (
      householdSize !== undefined &&
      (!Number.isInteger(householdSize) ||
        householdSize < 1 ||
        householdSize > MAX_HOUSEHOLD_SIZE)
    ) {
      throwValidationError("Invalid household size");
    }
    if (moveInDate && (!DATE_ONLY.test(moveInDate) || Number.isNaN(Date.parse(moveInDate)))) {
      throwValidationError("Invalid move-in date");
    }

    const next = {
      occupation: cleanText(profile.occupation, MAX_RENTAL_TEXT, "Occupation"),
      employer: cleanText(profile.employer, MAX_RENTAL_TEXT, "Employer"),
      netMonthlyIncome,
      householdSize,
      moveInDate: moveInDate || undefined,
      pets: profile.pets,
      smoker: profile.smoker,
      about: cleanText(profile.about, MAX_RENTAL_ABOUT, "About"),
      updatedAt: Date.now(),
    };
    const existing = await ctx.db
      .query("rentalFiles")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (existing) await ctx.db.replace(existing._id, { userId: ctx.user._id, ...next });
    else await ctx.db.insert("rentalFiles", { userId: ctx.user._id, ...next });
    return null;
  },
});

/** Attaches a file already uploaded to R2 and verified by `syncMetadata`. */
export const attachDocument = authMutation({
  args: {
    key: v.string(),
    category: rentalDocumentCategoryValidator,
    fileName: v.string(),
  },
  returns: v.id("rentalDocuments"),
  handler: async (ctx, { key, category, fileName }) => {
    const userId = ctx.user._id;
    const grant = await assertVerifiedUpload(ctx, {
      key,
      userId,
      kind: "rentalDocument",
    });
    const existing = await ctx.db
      .query("rentalDocuments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(MAX_RENTAL_DOCUMENTS);
    if (existing.length >= MAX_RENTAL_DOCUMENTS) {
      throwLimitReached("Rental document limit reached", {
        limit: MAX_RENTAL_DOCUMENTS,
      });
    }
    const name = fileName.trim().slice(0, MAX_RENTAL_FILE_NAME) || "document";
    const id = await ctx.db.insert("rentalDocuments", {
      userId,
      category,
      key,
      fileName: name,
      contentType: grant.expectedContentType,
      uploadedAt: Date.now(),
    });
    await consumeUploadGrant(ctx, key);
    return id;
  },
});

export const removeDocument = authMutation({
  args: { id: v.id("rentalDocuments") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const document = await ctx.db.get(id);
    if (!document) throwNotFound("Document not found");
    if (document.userId !== ctx.user._id) throwForbidden();
    await ctx.db.delete(id);
    await r2.deleteObject(ctx, document.key);
    return null;
  },
});

/** Ends a landlord's access to a dossier that was sent to them. */
export const revokeAccess = authMutation({
  args: { applicationId: v.id("rentalApplications") },
  returns: v.null(),
  handler: async (ctx, { applicationId }) => {
    const application = await ctx.db.get(applicationId);
    if (!application) throwNotFound("Application not found");
    if (application.candidateId !== ctx.user._id) throwForbidden();
    if (application.revokedAt === undefined) {
      await ctx.db.patch(applicationId, { revokedAt: Date.now() });
    }
    return null;
  },
});
