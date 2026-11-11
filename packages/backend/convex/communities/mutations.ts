import { v } from "convex/values";
import { generatedSlug } from "@hallomada/shared/slug";
import { authMutation } from "../functions";
import { limiter } from "../rateLimits";
import {
  throwForbidden,
  throwLimitReached,
  throwValidationError,
} from "../utils/errors";

const MAX_LABEL_LENGTH = 60;
const MAX_RULES_LENGTH = 1000;

const communityFocusArgs = {
  city: v.optional(v.string()),
  theme: v.optional(v.string()),
  rules: v.optional(v.string()),
};

/** A community is anchored to exactly one of a city or a theme. */
function normalizeFocus(args: {
  city?: string;
  theme?: string;
  rules?: string;
}): {
  kind: "city" | "theme";
  city?: string;
  theme?: string;
  rules?: string;
} {
  const city = args.city?.trim() || undefined;
  const theme = args.theme?.trim() || undefined;
  const rules = args.rules?.trim() || undefined;
  if (!city === !theme) {
    throwValidationError("A community needs exactly one of a city or a theme");
  }
  if ((city ?? theme!).length > MAX_LABEL_LENGTH) {
    throwValidationError(
      `City or theme cannot exceed ${MAX_LABEL_LENGTH} characters`,
    );
  }
  if (rules && rules.length > MAX_RULES_LENGTH) {
    throwValidationError(
      `Rules cannot exceed ${MAX_RULES_LENGTH} characters`,
    );
  }
  return {
    kind: city ? "city" : "theme",
    ...(city ? { city } : { theme }),
    ...(rules ? { rules } : {}),
  };
}

export const createCommunity = authMutation({
  args: {
    name: v.string(),
    description: v.string(),
    ...communityFocusArgs,
    // Kept temporarily for backward-compatible callers. All new communities
    // are public until privacy settings are reintroduced.
    privacy: v.optional(
      v.union(
        v.literal("public"),
        v.literal("private"),
        v.literal("secret"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const focus = normalizeFocus(args);
    const rate = await limiter.limit(ctx, "createCommunityPerUser", {
      key: user._id,
    });
    if (!rate.ok) {
      throwLimitReached("Community creation limit reached", {
        retryAfter: rate.retryAfter ?? 0,
      });
    }

    const slug = generatedSlug(args.name);

    const comId = await ctx.db.insert("communities", {
      name: args.name,
      slug,
      description: args.description,
      authorId: user._id,
      authorName: user.name,
      privacy: "public",
      ...focus,
      searchAll: `${args.name} ${args.description} ${focus.city ?? focus.theme} ${user.name}`,
    });

    // Ajouter le créateur comme admin
    await ctx.db.insert("communityMembers", {
      userId: user._id,
      communityId: comId,
      role: "admin",
    });

    // const distinctId = posthogDistinctId(user._id);
    // await posthog.groupIdentify(ctx, {
    //   groupType: "community",
    //   groupKey: comId,
    //   properties: { name: args.name, privacy: args.privacy, slug },
    //   distinctId,
    // });
    // await posthog.capture(ctx, {
    //   distinctId,
    //   event: "community_created",
    //   properties: {
    //     community_id: comId,
    //     slug,
    //     privacy: args.privacy,
    //   },
    //   groups: { community: comId },
    // });

    return { comId, slug };
  },
});

export const updateCommunity = authMutation({
  args: {
    id: v.id("communities"),
    name: v.string(),
    description: v.string(),
    ...communityFocusArgs,
    privacy: v.union(
      v.literal("public"),
      v.literal("private"),
      v.literal("secret"),
    ),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const community = await ctx.db.get(args.id);
    if (!community) throw new Error("Community not found");
    if (community.authorId !== user._id) throwForbidden("Not authorized");

    const focus = normalizeFocus(args);
    await ctx.db.patch(args.id, {
      name: args.name,
      description: args.description,
      privacy: "public",
      kind: focus.kind,
      city: focus.city,
      theme: focus.theme,
      rules: focus.rules,
      searchAll: `${args.name} ${args.description} ${focus.city ?? focus.theme} ${user.name}`,
    });
  },
});

export const joinCommunity = authMutation({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const community = await ctx.db.get(args.communityId);
    if (!community) throw new Error("Community not found");

    const existing = await ctx.db
      .query("communityMembers")
      .withIndex("by_userId_and_communityId", (q) =>
        q.eq("userId", user._id).eq("communityId", args.communityId),
      )
      .unique();

    if (existing) throw new Error("Already a member");

    await ctx.db.insert("communityMembers", {
      userId: user._id,
      communityId: args.communityId,
      role: "member",
    });

    // await posthog.capture(ctx, {
    //   distinctId: posthogDistinctId(user._id),
    //   event: "community_joined",
    //   properties: {
    //     community_id: args.communityId,
    //     community_slug: community.slug,
    //     privacy: community.privacy,
    //   },
    //   groups: { community: args.communityId },
    // });

    //notifcation
    if (community.authorId !== user._id) {
      await ctx.db.insert("notifications", {
        userId: community.authorId,
        type: "new_member",
        read: false,
        fromUserName: user.name,
        communitySlug: community.slug,
        message: `${user.name} a rejoint votre communauté "${community.name}"`,
      });
    }
  },
});

export const leaveCommunity = authMutation({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const community = await ctx.db.get(args.communityId);
    if (!community) throw new Error("Community not found");

    const member = await ctx.db
      .query("communityMembers")
      .withIndex("by_userId_and_communityId", (q) =>
        q.eq("userId", user._id).eq("communityId", args.communityId),
      )
      .unique();

    if (!member) throw new Error("Not a member");
    if (member.role === "admin")
      throw new Error("Admin cannot leave — delete the community instead");

    await ctx.db.delete(member._id);

    // await posthog.capture(ctx, {
    //   distinctId: posthogDistinctId(user._id),
    //   event: "community_left",
    //   properties: {
    //     community_id: args.communityId,
    //     community_slug: community.slug,
    //   },
    //   groups: { community: args.communityId },
    // });

    //notifcation
    if (community.authorId !== user._id) {
      await ctx.db.insert("notifications", {
        userId: community.authorId,
        type: "leave_community",
        read: false,
        fromUserName: user.name,
        communitySlug: community.slug,
        message: `${user.name} a quitté votre communauté "${community.name}"`,
      });
    }
  },
});
