import { consumePublicationQuota } from "../publicationQuotas";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { generatedSlug } from "@hallomada/shared/slug";
import {
  MAX_PROVIDER_PHOTOS,
  MAX_PROVIDER_SERVICE_NAME,
  MAX_PROVIDER_SERVICE_PRICE,
  MAX_PROVIDER_SERVICES,
  MAX_PROVIDER_TAGLINE,
  normalizePhoneNumber,
  normalizeSocialLink,
  normalizeWebsite,
} from "@hallomada/shared/providers";
import { isAllowedPublicationTransition } from "@hallomada/shared/publication-lifecycle";
import { authMutation } from "../functions";
import {
  assertVerifiedUpload,
  consumeUploadGrant,
  r2,
} from "../integrations/r2";
import { notifyAdministratorsOfPendingPublication } from "../notifications/admin";
import {
  throwForbidden,
  throwNotFound,
  throwValidationError,
} from "../utils/errors";
import { assertMaxLength, assertTextLimits, MAX_LENGTH } from "../utils/limits";
import {
  providerCategoryValidator,
  providerServiceModeValidator,
  providerServiceValidator,
} from "./values";

const imageValidator = v.object({ storageId: v.string() });

const providerFields = {
  name: v.string(),
  category: providerCategoryValidator,
  tagline: v.optional(v.string()),
  description: v.string(),
  city: v.string(),
  serviceModes: v.array(providerServiceModeValidator),
  services: v.array(providerServiceValidator),
  logo: v.optional(imageValidator),
  images: v.array(imageValidator),
  whatsapp: v.string(),
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
  website: v.optional(v.string()),
  facebook: v.optional(v.string()),
  instagram: v.optional(v.string()),
  tiktok: v.optional(v.string()),
};

const providerArgs = v.object(providerFields);
type ProviderInput = typeof providerArgs.type;

/** Validates and normalizes the provider form; throws on invalid input. */
function normalizeProviderInput(input: ProviderInput) {
  const name = input.name.trim();
  const city = input.city.trim();
  const description = input.description.trim();
  const tagline = input.tagline?.trim() || undefined;
  if (!name) throwValidationError("Name is required");
  if (!city) throwValidationError("City is required");
  if (description.length < 20) {
    throwValidationError("Description must be at least 20 characters");
  }
  assertTextLimits(
    { name, city, description },
    {
      name: MAX_LENGTH.name,
      city: MAX_LENGTH.name,
      description: MAX_LENGTH.description,
    },
  );
  assertMaxLength("tagline", tagline, MAX_PROVIDER_TAGLINE);

  if (input.services.length > MAX_PROVIDER_SERVICES) {
    throwValidationError(
      `A provider cannot list more than ${MAX_PROVIDER_SERVICES} services`,
    );
  }
  const services = input.services.flatMap((service) => {
    const serviceName = service.name.trim();
    const price = service.price?.trim() || undefined;
    if (!serviceName) return [];
    assertMaxLength("service", serviceName, MAX_PROVIDER_SERVICE_NAME);
    assertMaxLength("price", price, MAX_PROVIDER_SERVICE_PRICE);
    return [{ name: serviceName, ...(price ? { price } : {}) }];
  });

  if (input.images.length > MAX_PROVIDER_PHOTOS) {
    throwValidationError(
      `A provider cannot have more than ${MAX_PROVIDER_PHOTOS} photos`,
    );
  }

  const whatsapp = normalizePhoneNumber(input.whatsapp);
  if (!whatsapp) throwValidationError("Invalid WhatsApp number");

  const optional = <T>(
    raw: string | undefined,
    normalize: (value: string) => T | null,
    message: string,
  ) => {
    if (!raw?.trim()) return undefined;
    const normalized = normalize(raw);
    if (normalized === null) throwValidationError(message);
    return normalized;
  };

  const email = optional(
    input.email,
    (value) => {
      const normalized = value.trim().toLowerCase();
      return normalized.length <= MAX_LENGTH.email &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
        ? normalized
        : null;
    },
    "Invalid email",
  );
  const urlWithinLimit = (url: string | null) =>
    url && url.length <= MAX_LENGTH.url ? url : null;

  return {
    name,
    category: input.category,
    tagline,
    description,
    city,
    serviceModes: [...new Set(input.serviceModes)],
    services,
    logo: input.logo,
    images: input.images,
    whatsapp,
    phone: optional(input.phone, normalizePhoneNumber, "Invalid phone number"),
    email,
    website: optional(
      input.website,
      (value) => urlWithinLimit(normalizeWebsite(value)),
      "Invalid website",
    ),
    facebook: optional(
      input.facebook,
      (value) => urlWithinLimit(normalizeSocialLink("facebook", value)),
      "Invalid Facebook link",
    ),
    instagram: optional(
      input.instagram,
      (value) => urlWithinLimit(normalizeSocialLink("instagram", value)),
      "Invalid Instagram link",
    ),
    tiktok: optional(
      input.tiktok,
      (value) => urlWithinLimit(normalizeSocialLink("tiktok", value)),
      "Invalid TikTok link",
    ),
  };
}

function imageKeys(provider: Pick<ProviderInput, "logo" | "images">) {
  return new Set([
    ...(provider.logo ? [provider.logo.storageId] : []),
    ...provider.images.map((image) => image.storageId),
  ]);
}

function buildSearchText(provider: {
  name: string;
  category: string;
  tagline?: string;
  city: string;
  description: string;
  services: Array<{ name: string }>;
}) {
  return [
    provider.name,
    provider.category,
    provider.tagline,
    provider.city,
    provider.description,
    ...provider.services.map((service) => service.name),
  ]
    .filter(Boolean)
    .join(" ");
}

async function verifyNewUploads(
  ctx: MutationCtx,
  userId: string,
  keys: Iterable<string>,
) {
  for (const key of keys) {
    await assertVerifiedUpload(ctx, { key, userId, kind: "provider" });
  }
}

async function getOwnedProvider(
  ctx: MutationCtx & { user: { _id: string; role?: string | null } },
  providerId: Doc<"providers">["_id"],
  { allowAdmin }: { allowAdmin: boolean },
) {
  const provider = await ctx.db.get(providerId);
  if (!provider) throwNotFound("Provider not found");
  const isOwner = provider.authorId === ctx.user._id;
  const isAdmin = allowAdmin && ctx.user.role === "admin";
  if (!isOwner && !isAdmin) {
    throwForbidden("Not allowed to manage this provider page");
  }
  return { provider, isOwner, isAdmin };
}

export const createProvider = authMutation({
  args: providerFields,
  returns: v.object({ id: v.id("providers"), slug: v.string() }),
  handler: async (ctx, args) => {
    const provider = normalizeProviderInput(args);
    const keys = imageKeys(provider);
    await verifyNewUploads(ctx, ctx.user._id, keys);
    await consumePublicationQuota(ctx, "provider", ctx.user._id);

    const slug = generatedSlug(provider.name);
    const id = await ctx.db.insert("providers", {
      ...provider,
      slug,
      status: "pending",
      authorId: ctx.user._id,
      authorName: ctx.user.name,
      updatedAt: Date.now(),
      searchAll: buildSearchText(provider),
    });
    for (const key of keys) await consumeUploadGrant(ctx, key);

    await notifyAdministratorsOfPendingPublication(ctx, {
      resourceType: "provider",
      title: provider.name,
      authorName: ctx.user.name,
    });
    return { id, slug };
  },
});

export const updateProvider = authMutation({
  args: { providerId: v.id("providers"), provider: providerArgs },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { provider: current, isAdmin } = await getOwnedProvider(
      ctx,
      args.providerId,
      { allowAdmin: true },
    );
    const next = normalizeProviderInput(args.provider);

    const oldKeys = imageKeys(current);
    const newKeys = imageKeys(next);
    const addedKeys = [...newKeys].filter((key) => !oldKeys.has(key));
    const removedKeys = [...oldKeys].filter((key) => !newKeys.has(key));
    await verifyNewUploads(ctx, current.authorId, addedKeys);

    // Clear optional fields the owner emptied: patch ignores `undefined`.
    await ctx.db.replace(current._id, {
      ...next,
      slug: current.slug,
      authorId: current.authorId,
      authorName: current.authorName,
      // Any owner edit goes back through moderation, as for jobs and listings.
      status: isAdmin ? current.status : "pending",
      updatedAt: Date.now(),
      searchAll: buildSearchText(next),
    });

    for (const key of addedKeys) await consumeUploadGrant(ctx, key);
    const results = await Promise.allSettled(
      removedKeys.map((key) => r2.deleteObject(ctx, key)),
    );
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error(
        `updateProvider ${current._id}: ${failed.length} old R2 image(s) not deleted`,
        failed,
      );
    }

    if (!isAdmin && current.status !== "pending") {
      await notifyAdministratorsOfPendingPublication(ctx, {
        resourceType: "provider",
        title: next.name,
        authorName: ctx.user.name,
      });
    }
    return null;
  },
});

export const setProviderStatus = authMutation({
  args: {
    providerId: v.id("providers"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("closed"),
      v.literal("archived"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { providerId, status }) => {
    const { provider } = await getOwnedProvider(ctx, providerId, {
      allowAdmin: false,
    });
    if (!isAllowedPublicationTransition(provider.status, status)) {
      throwValidationError("Invalid provider status transition");
    }
    await ctx.db.patch(providerId, { status, updatedAt: Date.now() });
    if (status === "pending") {
      await notifyAdministratorsOfPendingPublication(ctx, {
        resourceType: "provider",
        title: provider.name,
        authorName: ctx.user.name,
      });
    }
    return null;
  },
});
