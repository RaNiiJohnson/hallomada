import { Infer, v } from "convex/values";

export const ADMIN_AUDIT_ACTIONS = [
  "user_created",
  "user_banned",
  "user_unbanned",
  "user_role_changed",
  "user_type_changed",
] as const;

export const adminAuditActionValidator = v.union(
  v.literal("user_created"),
  v.literal("user_banned"),
  v.literal("user_unbanned"),
  v.literal("user_role_changed"),
  v.literal("user_type_changed"),
);

export const adminAuditRoleValidator = v.union(
  v.literal("admin"),
  v.literal("user"),
);

export const adminAuditUserTypeValidator = v.union(
  v.literal("admin"),
  v.literal("seeker"),
  v.literal("provider"),
);

export const adminAuditMetadataValidator = v.object({
  role: v.optional(adminAuditRoleValidator),
  userType: v.optional(adminAuditUserTypeValidator),
});

export type AdminAuditAction = Infer<typeof adminAuditActionValidator>;
export type AdminAuditMetadata = Infer<typeof adminAuditMetadataValidator>;
