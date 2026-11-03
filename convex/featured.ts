import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { authMutation } from "./functions";
import { hasPremium } from "./premium";
import { throwForbidden, throwNotFound, throwValidationError } from "./utils/errors";

/**
 * "En vedette" badge. A Premium member can feature one listing and one job
 * offer at a time, for FEATURE_DURATION_MS (renewable). Scarcity keeps the
 * badge meaningful even while Premium is offered to everyone.
 */
export const FEATURE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const resourceValidator = v.union(
  v.object({ type: v.literal("listing"), id: v.id("RealestateListing") }),
  v.object({ type: v.literal("job"), id: v.id("JobOffer") }),
);

type Publication = Doc<"RealestateListing"> | Doc<"JobOffer">;

async function loadOwned(
  ctx: MutationCtx,
  resource: { type: "listing"; id: Doc<"RealestateListing">["_id"] } | { type: "job"; id: Doc<"JobOffer">["_id"] },
  userId: string,
): Promise<Publication> {
  const doc = await ctx.db.get(resource.id);
  if (!doc) throwNotFound("Publication not found");
  if (doc.authorId !== userId) throwForbidden();
  return doc;
}

/** Ends the member's other featured publication of the same kind, if any. */
async function releaseOtherSlot(
  ctx: MutationCtx,
  type: "listing" | "job",
  userId: string,
  keepId: string,
  now: number,
) {
  const mine =
    type === "listing"
      ? await ctx.db
          .query("RealestateListing")
          .withIndex("by_authorId", (q) => q.eq("authorId", userId))
          .take(200)
      : await ctx.db
          .query("JobOffer")
          .withIndex("by_authorId", (q) => q.eq("authorId", userId))
          .take(200);
  let released: string | null = null;
  for (const doc of mine) {
    if (doc._id === keepId) continue;
    if (doc.featuredUntil !== undefined && doc.featuredUntil > now) {
      await ctx.db.patch(doc._id, { featuredUntil: undefined });
      released = doc.title;
    }
  }
  return released;
}

export const feature = authMutation({
  args: { resource: resourceValidator },
  returns: v.object({
    featuredUntil: v.number(),
    replacedTitle: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, { resource }) => {
    const userId = ctx.user._id;
    if (!(await hasPremium(ctx, userId))) {
      throwForbidden("Premium is required to feature a publication");
    }
    const doc = await loadOwned(ctx, resource, userId);
    if (doc.status !== undefined && doc.status !== "active") {
      throwValidationError("Only published content can be featured");
    }
    const now = Date.now();
    const replacedTitle = await releaseOtherSlot(ctx, resource.type, userId, doc._id, now);
    const featuredUntil = now + FEATURE_DURATION_MS;
    await ctx.db.patch(resource.id, { featuredUntil });
    return { featuredUntil, replacedTitle };
  },
});

export const unfeature = authMutation({
  args: { resource: resourceValidator },
  returns: v.null(),
  handler: async (ctx, { resource }) => {
    await loadOwned(ctx, resource, ctx.user._id);
    await ctx.db.patch(resource.id, { featuredUntil: undefined });
    return null;
  },
});
