import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { migrations } from "./aggregates";
import { BUMP_COOLDOWN_MS } from "./bumpValues";
import { authMutation } from "./functions";
import { hasPremium } from "./premium";
import {
  throwForbidden,
  throwLimitReached,
  throwNotFound,
  throwValidationError,
} from "./utils/errors";

/**
 * "Remontée": a Premium member moves one of their published listings or job
 * offers back to the top of the default list, once per BUMP_COOLDOWN_MS for
 * each publication. Text searches stay ordered by relevance.
 */
export { BUMP_COOLDOWN_MS };

const resourceValidator = v.union(
  v.object({ type: v.literal("listing"), id: v.id("RealestateListing") }),
  v.object({ type: v.literal("job"), id: v.id("JobOffer") }),
);

export const bump = authMutation({
  args: { resource: resourceValidator },
  returns: v.object({ nextBumpAt: v.number() }),
  handler: async (ctx, { resource }) => {
    const userId = ctx.user._id;
    if (!(await hasPremium(ctx, userId))) {
      throwForbidden("Premium is required to bump a publication");
    }
    const doc: Doc<"RealestateListing"> | Doc<"JobOffer"> | null =
      await ctx.db.get(resource.id);
    if (!doc) throwNotFound("Publication not found");
    if (doc.authorId !== userId) throwForbidden();
    if (doc.status !== undefined && doc.status !== "active") {
      throwValidationError("Only published content can be bumped");
    }

    const now = Date.now();
    const nextAllowed = (doc.bumpedAt ?? 0) + BUMP_COOLDOWN_MS;
    if (now < nextAllowed) {
      throwLimitReached("This publication was bumped recently", {
        retryAfter: nextAllowed - now,
      });
    }
    await ctx.db.patch(resource.id, { listedAt: now, bumpedAt: now });
    return { nextBumpAt: now + BUMP_COOLDOWN_MS };
  },
});

// ---- backfill: give existing publications their place in the list ----
// Run once per deployment, right after deploying:
//   npx convex run aggregates:run '{"fn": "bump:backfillListedAtListings"}'
//   npx convex run aggregates:run '{"fn": "bump:backfillListedAtJobs"}'

export const backfillListedAtListings = migrations.define({
  table: "RealestateListing",
  migrateOne: async (_ctx, doc) =>
    doc.listedAt === undefined ? { listedAt: doc._creationTime } : undefined,
});

export const backfillListedAtJobs = migrations.define({
  table: "JobOffer",
  migrateOne: async (_ctx, doc) =>
    doc.listedAt === undefined ? { listedAt: doc._creationTime } : undefined,
});
