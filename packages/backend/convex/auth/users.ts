import { partial } from "convex-helpers/validators";
import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Doc as BetterAuthDoc } from "../betterAuth/_generated/dataModel";
import { UserType, userValidator } from "../betterAuth/users";
import { publicUserValidator } from "../betterAuth/publicUser";
import { authMutation, internalQuery, query } from "../functions";
import { authComponent } from "./auth";
import { r2 } from "../integrations/r2";

async function resolveProfileImages(user: UserType): Promise<UserType> {
  const [image, coverImage] = await Promise.all([
    user.image?.startsWith("profile/") ? r2.getUrl(user.image) : user.image,
    user.coverImage?.startsWith("cover/")
      ? r2.getUrl(user.coverImage)
      : user.coverImage,
  ]);
  return { ...user, image, coverImage };
}

const editableUserFields = userValidator.pick(
  "name",
  "slug",
  "headline",
  "bio",
  "city",
  "country",
  "industry",
  "roles",
  "company",
  "field",
  "skills",
  "experienceYears",
  "arrivalDate",
  "journey",
  "status",
  "isServiceProvider",
  "isPublic",
  "showEmail",
);

export type UserWithRoleType = BetterAuthDoc<"user"> & {
  id: string;
  role?: string | undefined;
  banned: boolean | null;
  banReason?: (string | null) | undefined;
  banExpires?: (number | null) | undefined;
};

export const getUserBySlug = query({
  args: { slug: v.string() },
  returns: v.union(publicUserValidator, v.null()),
  handler: async (ctx, { slug }) => {
    const viewer = await authComponent.safeGetAuthUser(ctx);
    const user: UserType | null = await ctx.runQuery(
      components.betterAuth.users.getUserBySlug,
      {
        slug,
        viewerId: viewer?._id,
      },
    );

    if (!user) return null;

    return await resolveProfileImages(user);
  },
});

export const getUserById = query({
  args: { id: v.string() },
  returns: v.union(publicUserValidator, v.null()),
  handler: async (ctx, { id }) => {
    const viewer = await authComponent.safeGetAuthUser(ctx);
    const user: UserType | null = await ctx.runQuery(
      components.betterAuth.users.getUserById,
      {
        id,
        viewerId: viewer?._id,
      },
    );

    if (!user) return null;

    return await resolveProfileImages(user);
  },
});

export const getAllUsers = query({
  args: {},
  returns: v.array(publicUserValidator),
  handler: async (ctx) => {
    const users: UserType[] = await ctx.runQuery(
      components.betterAuth.users.getAllUsers,
      {},
    );

    const currentUser = await authComponent.safeGetAuthUser(ctx);

    const filtered = currentUser
      ? users.filter((u) => u._id !== currentUser._id)
      : users;

    // Resolve image URLs in this context
    return await Promise.all(filtered.map(resolveProfileImages));
  },
});

export const getContactEmailById = internalQuery({
  args: { id: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { id }) => {
    return await ctx.runQuery(components.betterAuth.users.getContactEmailById, {
      id,
    });
  },
});

export const updateUser = authMutation({
  args: {
    patch: partial(editableUserFields),
  },
  handler: async (ctx, args) => {
    const user = ctx.user;
    await ctx.runMutation(components.betterAuth.users.updateUser, {
      id: user._id,
      patch: args.patch,
    });

    // const distinctId = posthogDistinctId(user._id);
    // await posthog.identify(ctx, {
    //   distinctId,
    //   properties: {
    //     email: user.email,
    //     name: args.patch.name ?? user.name,
    //     role: args.patch.userType ?? user.userType,
    //   },
    // });

    // if (args.patch.userType) {
    //   await posthog.capture(ctx, {
    //     distinctId,
    //     event: "user_role_selected",
    //     properties: { role: args.patch.userType },
    //   });
    // }
  },
});
