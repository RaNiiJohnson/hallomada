import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { Infer, v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { adminMutation, adminQuery, authMutation } from "./functions";
import { limiter } from "./rateLimits";
import {
  reportReasonValidator,
  reportStatusValidator,
  reportTargetValidator,
} from "./reportValues";
import schema from "./schema";
import {
  throwForbidden,
  throwLimitReached,
  throwNotFound,
  throwValidationError,
} from "./utils/errors";

const MAX_DETAILS_LENGTH = 500;
const MAX_LABEL_LENGTH = 160;

type ReportTarget = Infer<typeof reportTargetValidator>;

async function resolveTarget(ctx: MutationCtx, target: ReportTarget) {
  switch (target.type) {
    case "post": {
      const post = await ctx.db.get(target.id);
      return post
        ? {
            authorId: post.authorId,
            label: post.title,
            href: post.communitySlug
              ? `/communities/${post.communitySlug}/${post.slug}`
              : `/posts/${post.slug}`,
          }
        : null;
    }
    case "job": {
      const job = await ctx.db.get(target.id);
      return job
        ? {
            authorId: job.authorId,
            label: job.title,
            href: `/jobs/${job.slug}`,
          }
        : null;
    }
    case "listing": {
      const listing = await ctx.db.get(target.id);
      return listing
        ? {
            authorId: listing.authorId,
            label: listing.title,
            href: `/listing/${listing.slug}`,
          }
        : null;
    }
    case "community": {
      const community = await ctx.db.get(target.id);
      return community
        ? {
            authorId: community.authorId,
            label: community.name,
            href: `/communities/${community.slug}`,
          }
        : null;
    }
    case "provider": {
      const provider = await ctx.db.get(target.id);
      return provider
        ? {
            authorId: provider.authorId,
            label: provider.name,
            href: `/providers/${provider.slug}`,
          }
        : null;
    }
  }
}

export const create = authMutation({
  args: {
    target: reportTargetValidator,
    reason: reportReasonValidator,
    details: v.optional(v.string()),
  },
  returns: v.id("reports"),
  handler: async (ctx, args) => {
    const target = await resolveTarget(ctx, args.target);
    if (!target) throwNotFound("Reported content not found");
    if (target.authorId === ctx.user._id) {
      throwForbidden("You cannot report your own content");
    }

    const existingReport = await ctx.db
      .query("reports")
      .withIndex("by_reporterId_and_targetType_and_targetId", (q) =>
        q
          .eq("reporterId", ctx.user._id)
          .eq("targetType", args.target.type)
          .eq("targetId", args.target.id),
      )
      .unique();
    if (existingReport) {
      throwValidationError("You already reported this content");
    }

    const details = args.details?.trim();
    if (details && details.length > MAX_DETAILS_LENGTH) {
      throwValidationError(
        `Report details cannot exceed ${MAX_DETAILS_LENGTH} characters`,
      );
    }

    const rate = await limiter.limit(ctx, "reportPerUser", {
      key: ctx.user._id,
    });
    if (!rate.ok) {
      throwLimitReached("Daily report limit reached", {
        retryAfter: rate.retryAfter ?? 0,
      });
    }

    return await ctx.db.insert("reports", {
      reporterId: ctx.user._id,
      ...(ctx.user.name ? { reporterName: ctx.user.name } : {}),
      targetType: args.target.type,
      targetId: args.target.id,
      targetLabel: target.label.trim().slice(0, MAX_LABEL_LENGTH),
      targetHref: target.href,
      reason: args.reason,
      ...(details ? { details } : {}),
      status: "new",
      reportedAt: Date.now(),
    });
  },
});

export const list = adminQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(reportStatusValidator),
  },
  returns: paginationResultValidator(schema.doc("reports")),
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("reports")
        .withIndex("by_status_and_reportedAt", (q) =>
          q.eq("status", args.status!),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("reports")
      .withIndex("by_reportedAt")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/** Open reports, for the admin sidebar badge (capped like the queues). */
export const countOpen = adminQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const open = await ctx.db
      .query("reports")
      .withIndex("by_status_and_reportedAt", (q) => q.eq("status", "new"))
      .take(100);
    return open.length;
  },
});

export const markHandled = adminMutation({
  args: { reportId: v.id("reports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throwNotFound("Report not found");
    if (report.status === "handled") return null;

    await ctx.db.patch(args.reportId, {
      status: "handled",
      handledAt: Date.now(),
      handledById: ctx.user._id,
      ...(ctx.user.name ? { handledByName: ctx.user.name } : {}),
    });
    return null;
  },
});
