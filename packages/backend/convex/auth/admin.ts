import { Infer, v } from "convex/values";
import { generatedSlug } from "@hallomada/shared/slug";
import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import type {
  AdminAuditAction,
  AdminAuditMetadata,
} from "../adminAuditValues";
import { adminAction, adminMutation, adminQuery } from "../functions";
import { throwForbidden } from "../utils/errors";
import { authComponent, createAuth } from "./auth";

const roleValidator = v.union(v.literal("admin"), v.literal("user"));
const userTypeValidator = v.union(
  v.literal("admin"),
  v.literal("seeker"),
  v.literal("provider"),
);

const adminUserValidator = v.object({
  id: v.string(),
  name: v.string(),
  email: v.string(),
  createdAt: v.number(),
  role: roleValidator,
  userType: v.union(userTypeValidator, v.null()),
  banned: v.boolean(),
  city: v.union(v.string(), v.null()),
  slug: v.union(v.string(), v.null()),
  image: v.union(v.string(), v.null()),
});

const searchValidator = v.object({
  value: v.string(),
  field: v.union(v.literal("name"), v.literal("email")),
  operator: v.union(
    v.literal("contains"),
    v.literal("starts_with"),
    v.literal("ends_with"),
  ),
});

const filterValidator = v.union(
  v.object({ field: v.literal("banned"), value: v.boolean() }),
  v.object({ field: v.literal("role"), value: roleValidator }),
  v.object({ field: v.literal("userType"), value: userTypeValidator }),
);

const sortValidator = v.object({
  field: v.union(
    v.literal("createdAt"),
    v.literal("name"),
    v.literal("email"),
  ),
  direction: v.union(v.literal("asc"), v.literal("desc")),
});

export type AdminUser = Infer<typeof adminUserValidator>;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_DASHBOARD_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;

type AdminAuditContext = {
  user: { _id: string; name?: string | null };
  runMutation: MutationCtx["runMutation"];
};

async function recordAdminAudit(
  ctx: AdminAuditContext,
  event: {
    action: AdminAuditAction;
    targetId: string;
    targetLabel?: string;
    metadata?: AdminAuditMetadata;
  },
) {
  const administratorLabel = ctx.user.name?.trim();
  const targetLabel = event.targetLabel?.trim();

  await ctx.runMutation(internal.adminAudit.record, {
    administratorId: ctx.user._id,
    ...(administratorLabel ? { administratorLabel } : {}),
    action: event.action,
    targetId: event.targetId,
    ...(targetLabel ? { targetLabel } : {}),
    ...(event.metadata ? { metadata: event.metadata } : {}),
  });
}

function toTimestamp(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function projectAdminUser(user: Record<string, unknown>): AdminUser {
  const role = user.role === "admin" ? "admin" : "user";
  const userType =
    user.userType === "admin" ||
    user.userType === "seeker" ||
    user.userType === "provider"
      ? user.userType
      : null;

  return {
    id: String(user.id ?? user._id ?? ""),
    name: typeof user.name === "string" ? user.name : "",
    email: typeof user.email === "string" ? user.email : "",
    createdAt: toTimestamp(user.createdAt),
    role,
    userType,
    banned: user.banned === true,
    city: typeof user.city === "string" ? user.city : null,
    slug: typeof user.slug === "string" ? user.slug : null,
    image: typeof user.image === "string" ? user.image : null,
  };
}

async function assertNotLastAdministrator(
  auth: ReturnType<typeof createAuth>,
  headers: Headers,
  userId: string,
) {
  const target = await auth.api.getUser({ query: { id: userId }, headers });
  if (target.role !== "admin") return target;

  const administrators = await auth.api.listUsers({
    query: {
      limit: 1,
      offset: 0,
      filterField: "role",
      filterValue: "admin",
      filterOperator: "eq",
    },
    headers,
  });

  if (administrators.total <= 1) {
    throwForbidden("The last administrator cannot be demoted or deleted.");
  }

  return target;
}

export const listUsers = adminQuery({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    search: v.optional(searchValidator),
    filter: v.optional(filterValidator),
    sort: v.optional(sortValidator),
  },
  returns: v.object({
    users: v.array(adminUserValidator),
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
  }),
  handler: async (ctx, args) => {
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.floor(args.limit ?? DEFAULT_PAGE_SIZE)),
    );
    const offset = Math.max(0, Math.floor(args.offset ?? 0));
    const searchValue = args.search?.value.trim();
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const result = await auth.api.listUsers({
      query: {
        limit,
        offset,
        ...(searchValue
          ? {
              searchValue,
              searchField: args.search!.field,
              searchOperator: args.search!.operator,
            }
          : {}),
        ...(args.filter
          ? {
              filterField: args.filter.field,
              filterValue: args.filter.value,
              filterOperator: "eq" as const,
            }
          : {}),
        ...(args.sort
          ? {
              sortBy: args.sort.field,
              sortDirection: args.sort.direction,
            }
          : {}),
      },
      headers,
    });

    return {
      users: result.users.map((user) =>
        projectAdminUser(user as unknown as Record<string, unknown>),
      ),
      total: result.total,
      limit,
      offset,
    };
  },
});

export const getDashboard = adminQuery({
  args: {
    windowStart: v.number(),
    asOf: v.number(),
  },
  returns: v.object({
    totalMembers: v.number(),
    newMembers: v.number(),
    bannedMembers: v.number(),
    recentMembers: v.array(adminUserValidator),
    windowStart: v.number(),
    asOf: v.number(),
  }),
  handler: async (ctx, args) => {
    const windowDuration = args.asOf - args.windowStart;
    if (
      !Number.isFinite(args.windowStart) ||
      !Number.isFinite(args.asOf) ||
      args.windowStart < 0 ||
      windowDuration < 0 ||
      windowDuration > MAX_DASHBOARD_WINDOW_MS
    ) {
      throw new Error("Dashboard time window must be between 0 and 31 days.");
    }

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const [members, newMembers, bannedMembers] = await Promise.all([
      auth.api.listUsers({
        query: {
          limit: 5,
          offset: 0,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
        headers,
      }),
      auth.api.listUsers({
        query: {
          limit: 1,
          offset: 0,
          filterField: "createdAt",
          filterValue: args.windowStart,
          filterOperator: "gte",
        },
        headers,
      }),
      auth.api.listUsers({
        query: {
          limit: 1,
          offset: 0,
          filterField: "banned",
          filterValue: true,
          filterOperator: "eq",
        },
        headers,
      }),
    ]);

    return {
      totalMembers: members.total,
      newMembers: newMembers.total,
      bannedMembers: bannedMembers.total,
      recentMembers: members.users
        .slice(0, 5)
        .map((user) =>
          projectAdminUser(user as unknown as Record<string, unknown>),
        ),
      windowStart: args.windowStart,
      asOf: args.asOf,
    };
  },
});

export const banUser = adminMutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.userId === ctx.user._id) {
      throwForbidden("Cannot ban your own account.");
    }
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const target = await auth.api.getUser({
      query: { id: args.userId },
      headers,
    });
    if (target.banned === true) return null;
    await auth.api.banUser({
      body: { userId: args.userId, banReason: "Policy violation" },
      headers,
    });
    await recordAdminAudit(ctx, {
      action: "user_banned",
      targetId: args.userId,
      targetLabel: target.name,
    });
    return null;
  },
});

export const unbanUser = adminMutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.userId === ctx.user._id) {
      throwForbidden("Cannot perform this action on your own account.");
    }
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const target = await auth.api.getUser({
      query: { id: args.userId },
      headers,
    });
    if (target.banned !== true) return null;
    await auth.api.unbanUser({ body: { userId: args.userId }, headers });
    await recordAdminAudit(ctx, {
      action: "user_unbanned",
      targetId: args.userId,
      targetLabel: target.name,
    });
    return null;
  },
});

export const setUserRole = adminMutation({
  args: { userId: v.string(), role: roleValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.userId === ctx.user._id) {
      throwForbidden("Cannot change your own administrator role.");
    }
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const target =
      args.role === "admin"
        ? await auth.api.getUser({
            query: { id: args.userId },
            headers,
          })
        : await assertNotLastAdministrator(auth, headers, args.userId);
    if (target.role === args.role) return null;
    await auth.api.setRole({
      body: { userId: args.userId, role: args.role },
      headers,
    });
    await recordAdminAudit(ctx, {
      action: "user_role_changed",
      targetId: args.userId,
      targetLabel: target.name,
      metadata: { role: args.role },
    });
    return null;
  },
});

export const setUserType = adminMutation({
  args: { userId: v.string(), userType: userTypeValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const target = await auth.api.getUser({
      query: { id: args.userId },
      headers,
    });
    const currentUserType = (target as unknown as Record<string, unknown>)
      .userType;
    if (currentUserType === args.userType) return null;
    await auth.api.adminUpdateUser({
      body: { userId: args.userId, data: { userType: args.userType } },
      headers,
    });
    await recordAdminAudit(ctx, {
      action: "user_type_changed",
      targetId: args.userId,
      targetLabel: target.name,
      metadata: { userType: args.userType },
    });
    return null;
  },
});

export const createUser = adminMutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    role: roleValidator,
    userType: userTypeValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const created = await auth.api.createUser({
      body: {
        email: args.email,
        password: args.password,
        name: args.name,
        role: args.role,
        data: {
          userType: args.userType,
          slug: generatedSlug(args.name),
          emailVerified: true,
          isPublic: true,
          showEmail: true,
          showPhone: false,
        },
      },
      headers,
    });
    await recordAdminAudit(ctx, {
      action: "user_created",
      targetId: created.user.id,
      targetLabel: args.name,
      metadata: { role: args.role, userType: args.userType },
    });
    return null;
  },
});

/**
 * Permanent deletion remains unavailable in V1. The current user cascade does
 * not cover every owned resource and Better Auth would be removed before the
 * cascade completes, so the operation is not recoverable after partial failure.
 */
export const deleteUser = adminAction({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.userId === ctx.user._id) {
      throwForbidden("Cannot delete your own account.");
    }
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await assertNotLastAdministrator(auth, headers, args.userId);
    throwForbidden("Permanent user deletion is unavailable; use ban instead.");
  },
});
