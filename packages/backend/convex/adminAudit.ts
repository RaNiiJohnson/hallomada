import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import {
  adminAuditActionValidator,
  adminAuditMetadataValidator,
} from "./adminAuditValues";
import { adminQuery, internalMutation } from "./functions";
import schema from "./schema";

const MAX_SAFE_LABEL_LENGTH = 120;

function safeLabel(value: string | undefined) {
  const label = value?.trim();
  return label ? label.slice(0, MAX_SAFE_LABEL_LENGTH) : undefined;
}

export const record = internalMutation({
  args: {
    administratorId: v.string(),
    administratorLabel: v.optional(v.string()),
    action: adminAuditActionValidator,
    targetId: v.string(),
    targetLabel: v.optional(v.string()),
    metadata: v.optional(adminAuditMetadataValidator),
  },
  returns: v.id("adminAuditEvents"),
  handler: async (ctx, args) => {
    const administratorLabel = safeLabel(args.administratorLabel);
    const targetLabel = safeLabel(args.targetLabel);

    return await ctx.db.insert("adminAuditEvents", {
      administratorId: args.administratorId,
      ...(administratorLabel ? { administratorLabel } : {}),
      action: args.action,
      targetType: "user",
      targetId: args.targetId,
      ...(targetLabel ? { targetLabel } : {}),
      occurredAt: Date.now(),
      ...(args.metadata ? { metadata: args.metadata } : {}),
    });
  },
});

export const list = adminQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(schema.doc("adminAuditEvents")),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("adminAuditEvents")
      .withIndex("by_occurredAt")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
