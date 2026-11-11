import { partial } from "convex-helpers/validators";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  projectPublicUser,
  PublicUser,
  publicUserValidator,
} from "./publicUser";
import schema from "./schema";

export const getAllUsers = query({
  args: {},
  returns: v.array(publicUserValidator),
  handler: async (ctx) => {
    const users = await ctx.db.query("user").take(100);
    return users
      .filter((user) => user.isPublic !== false)
      .map((user) => projectPublicUser(user))
      .filter((user): user is PublicUser => user !== null);
  },
});

export const getUserBySlug = query({
  args: { slug: v.string(), viewerId: v.optional(v.string()) },
  returns: v.union(publicUserValidator, v.null()),
  handler: async (ctx, { slug, viewerId }) => {
    const user = await ctx.db
      .query("user")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    return user ? projectPublicUser(user, { viewerId }) : null;
  },
});

export const getUserById = query({
  args: { id: v.string(), viewerId: v.optional(v.string()) },
  returns: v.union(publicUserValidator, v.null()),
  handler: async (ctx, { id, viewerId }) => {
    const normalizedId = ctx.db.normalizeId("user", id);
    if (!normalizedId) return null;
    const user = await ctx.db.get(normalizedId);
    return user ? projectPublicUser(user, { viewerId }) : null;
  },
});

export const getContactEmailById = query({
  args: { id: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { id }) => {
    const normalizedId = ctx.db.normalizeId("user", id);
    if (!normalizedId) return null;
    return (await ctx.db.get(normalizedId))?.email ?? null;
  },
});

export const getAdministratorIds = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const administrators = await ctx.db
      .query("user")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .take(100);

    return administrators.map((administrator) => administrator._id);
  },
});

export const userValidator = schema.tables.user.validator;

export type UserType = PublicUser;

export const updateUser = mutation({
  args: {
    id: v.id("user"),
    patch: partial(userValidator),
  },
  handler: async (ctx, { id, patch }) => {
    await ctx.db.patch(id, patch);
  },
});
