import { v } from "convex/values";
import { generatedSlug } from "../../src/lib/utils";
import { isAllowedPublicationTransition } from "../../src/lib/publication-lifecycle";
import { authMutation } from "../functions";
import {
  assertVerifiedUpload,
  consumeUploadGrant,
  r2,
} from "../integrations/r2";
import { notifyAdministratorsOfPendingPublication } from "../notifications/admin";
import { consumePublicationQuota } from "../publicationQuotas";
import {
  throwForbidden,
  throwNotFound,
  throwValidationError,
} from "../utils/errors";
import { containsSensitivePublicListingText } from "./privacy";

const imageValidator = v.object({
  storageId: v.optional(v.string()),
  url: v.optional(v.string()),
  publicId: v.optional(v.string()),
  secureUrl: v.optional(v.string()),
});

const contactValidator = v.object({
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
});

const listingStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("closed"),
  v.literal("archived"),
);

type ListingMode = "rent" | "sale";
type RentalTermsInput = {
  charges?: number | null;
  deposit?: number | null;
  availableFrom?: number | null;
};

function normalizeRentalTerms(
  listingMode: ListingMode,
  { charges, deposit, availableFrom }: RentalTermsInput,
) {
  if (listingMode === "sale") {
    return {
      deposit: undefined,
      ...(charges !== undefined ? { charges: charges ?? undefined } : {}),
      ...(availableFrom !== undefined
        ? { availableFrom: availableFrom ?? undefined }
        : {}),
    };
  }

  return {
    ...(charges !== undefined ? { charges: charges ?? undefined } : {}),
    ...(deposit !== undefined ? { deposit: deposit ?? undefined } : {}),
    ...(availableFrom !== undefined
      ? { availableFrom: availableFrom ?? undefined }
      : {}),
  };
}

type ListingContactInput = {
  phone?: string;
  email?: string;
};

function normalizeContact(contact: ListingContactInput | undefined) {
  const phone = contact?.phone?.trim() || undefined;
  const email = contact?.email?.trim().toLowerCase() || undefined;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throwValidationError("Invalid contact email");
  }
  if (phone && !/^\+?[0-9 ()-]{6,30}$/.test(phone)) {
    throwValidationError("Invalid contact phone number");
  }
  return { phone, email };
}

function assertPublicTextIsSafe(values: {
  title: string;
  city: string;
  neighborhood?: string;
  description: string;
  extras?: string[];
}) {
  if (containsSensitivePublicListingText([
    values.title,
    values.city,
    values.neighborhood,
    values.description,
    ...(values.extras ?? []),
  ])) {
    throwValidationError(
      "Public listing text must not include contact details, GPS coordinates, or an exact address",
    );
  }
}

function assertListingCity(city: string) {
  if (!city.trim()) {
    throwValidationError("City is required");
  }
}

export const createListing = authMutation({
  args: {
    title: v.string(),
    propertyType: v.union(
      v.literal("room"),
      v.literal("apartment"),
      v.literal("house"),
      v.literal("studio"),
      v.literal("shared"),
    ),
    listingMode: v.union(v.literal("rent"), v.literal("sale")),
    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
    city: v.string(),
    neighborhood: v.optional(v.string()),
    price: v.number(),

    charges: v.optional(v.number()),
    deposit: v.optional(v.number()),
    area: v.number(),
    bedrooms: v.number(),
    bathrooms: v.number(),
    floor: v.number(),
    pets: v.boolean(),
    images: v.array(
      v.object({
        storageId: v.optional(v.string()),
        url: v.optional(v.string()),
        publicId: v.optional(v.string()),
        secureUrl: v.optional(v.string()),
      }),
    ),
    description: v.string(),
    extras: v.array(v.string()),
    availableFrom: v.optional(v.number()),
    contact: v.optional(contactValidator),
  },
  returns: v.id("RealestateListing"),
  handler: async (ctx, args) => {
    const user = ctx.user;
    const { contact, charges, deposit, availableFrom, ...listingArgs } = args;
    const normalizedContact = normalizeContact(contact);
    if (availableFrom === undefined) {
      throwValidationError("Availability date is required");
    }
    if (!normalizedContact.email && !normalizedContact.phone) {
      throwValidationError("An email address or WhatsApp phone number is required");
    }
    assertListingCity(args.city);
    assertPublicTextIsSafe(listingArgs);
    await consumePublicationQuota(ctx, "listing", user._id);

    const uploadedKeys = args.images.flatMap((image) =>
      image.storageId ? [image.storageId] : [],
    );
    for (const key of new Set(uploadedKeys)) {
      await assertVerifiedUpload(ctx, {
        key,
        userId: user._id,
        kind: "listing",
      });
    }

    const searchAllContent = `${args.title} ${args.propertyType} ${args.listingMode} ${args.city} ${args.description}`;

    const listingId = await ctx.db.insert("RealestateListing", {
      ...listingArgs,
      slug: generatedSlug(args.title),
      authorId: user._id,
      authorName: user.name,
      status: "pending",
      updatedAt: Date.now(),
      searchAll: searchAllContent,
      currency: "EUR",
      ...normalizeRentalTerms(args.listingMode, {
        charges,
        deposit,
        availableFrom,
      }),
    });

    for (const key of new Set(uploadedKeys)) {
      await consumeUploadGrant(ctx, key);
    }

    if (normalizedContact.phone || normalizedContact.email) {
      await ctx.db.insert("RealestateContactInfo", {
        listingId,
        listing: args.title,
        ...normalizedContact,
      });
    }
    await notifyAdministratorsOfPendingPublication(ctx, {
      resourceType: "listing",
      title: args.title,
      authorName: user.name,
    });

    // await posthog.capture(ctx, {
    //   distinctId: posthogDistinctId(user._id),
    //   event: "listing_created",
    //   properties: {
    //     listing_id: listingId,
    //     property_type: args.propertyType,
    //     listing_mode: args.listingMode,
    //     city: args.city,
    //     price: args.price,
    //   },
    // });

    return listingId;
  },
});

export const archiveListing = authMutation({
  args: { listingId: v.id("RealestateListing") },
  returns: v.null(),
  handler: async (ctx, { listingId }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing) throwNotFound("Listing not found");

    if (listing.authorId !== ctx.user._id) {
      throwForbidden("Not allowed to archive this listing");
    }
    if (!isAllowedPublicationTransition(listing.status, "archived")) {
      throwValidationError("Listing must be closed before it can be archived");
    }

    // Listings are retained by default: contacts, translations, bookmarks and
    // images remain intact so the owner can restore the record if needed.
    await ctx.db.patch(listingId, { status: "archived", updatedAt: Date.now() });
    return null;
  },
});

export const setListingStatus = authMutation({
  args: { listingId: v.id("RealestateListing"), status: listingStatusValidator },
  returns: v.null(),
  handler: async (ctx, { listingId, status }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing) throwNotFound("Listing not found");
    if (listing.authorId !== ctx.user._id) {
      throwForbidden("Not allowed to change this listing status");
    }
    if (!isAllowedPublicationTransition(listing.status, status)) {
      throwValidationError("Invalid listing status transition");
    }
    await ctx.db.patch(listingId, { status, updatedAt: Date.now() });
    return null;
  },
});

export const updateListing = authMutation({
  args: {
    listingId: v.id("RealestateListing"),
    contact: v.optional(contactValidator),
    patch: v.object({
      title: v.optional(v.string()),
      propertyType: v.optional(
        v.union(
          v.literal("room"),
          v.literal("apartment"),
          v.literal("house"),
          v.literal("studio"),
          v.literal("shared"),
        ),
      ),
      listingMode: v.optional(v.union(v.literal("rent"), v.literal("sale"))),
      location: v.optional(
        v.union(v.object({ lat: v.number(), lng: v.number() }), v.null()),
      ),
      city: v.optional(v.string()),
      neighborhood: v.optional(v.string()),
      price: v.optional(v.number()),
      charges: v.optional(v.union(v.number(), v.null())),
      deposit: v.optional(v.union(v.number(), v.null())),
      period: v.optional(v.literal("month")),
      area: v.optional(v.number()),
      bedrooms: v.optional(v.number()),
      bathrooms: v.optional(v.number()),
      floor: v.optional(v.number()),
      pets: v.optional(v.boolean()),
      images: v.optional(v.array(imageValidator)),
      description: v.optional(v.string()),
      extras: v.optional(v.array(v.string())),
      availableFrom: v.optional(v.union(v.number(), v.null())),
    }),
  },
  returns: v.null(),
  handler: async (ctx, { listingId, patch, contact }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing) throwNotFound("Listing not found");

    const isOwner = listing.authorId === ctx.user._id;
    const isAdmin = ctx.user.role === "admin";
    if (!isOwner && !isAdmin) {
      throwForbidden("Not allowed to update this listing");
    }

    const { location, charges, deposit, availableFrom, ...otherFields } = patch;
    const nextListingMode = otherFields.listingMode ?? listing.listingMode;
    const normalizedPatch = {
      ...otherFields,
      ...(location !== undefined ? { location: location ?? undefined } : {}),
      ...normalizeRentalTerms(nextListingMode, {
        charges,
        deposit,
        availableFrom,
      }),
    };

    if (normalizedPatch.images) {
      const oldKeys = new Set(
        (listing.images ?? [])
          .filter((img) => img.storageId)
          .map((img) => img.storageId!),
      );
      const newKeys = new Set(
        normalizedPatch.images
          .filter((img) => img.storageId)
          .map((img) => img.storageId!),
      );
      const removedKeys = [...oldKeys].filter((k) => !newKeys.has(k));
      const addedKeys = [...newKeys].filter((k) => !oldKeys.has(k));

      for (const key of addedKeys) {
        await assertVerifiedUpload(ctx, {
          key,
          userId: ctx.user._id,
          kind: "listing",
        });
      }

      const results = await Promise.allSettled(
        removedKeys.map((key) => r2.deleteObject(ctx, key)),
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        console.error(
          `updateListing ${listingId}: ${failed.length} ancienne(s) image(s) R2 non supprimée(s)`,
          failed,
        );
      }

      for (const key of addedKeys) {
        await consumeUploadGrant(ctx, key);
      }
    }

    const updatedListing = { ...listing, ...normalizedPatch };
    assertListingCity(updatedListing.city);
    assertPublicTextIsSafe(updatedListing);
    const searchAllContent = `${updatedListing.title} ${updatedListing.propertyType} ${updatedListing.city} ${updatedListing.listingMode} ${updatedListing.description}`;

    await ctx.db.patch(listingId, {
      ...normalizedPatch,
      searchAll: searchAllContent,
      ...(!isAdmin ? { status: "pending" as const } : {}),
      updatedAt: Date.now(),
    });

    const existingContact = await ctx.db
      .query("RealestateContactInfo")
      .withIndex("by_listingId", (q) => q.eq("listingId", listingId))
      .unique();

    if (contact !== undefined) {
      const normalizedContact = normalizeContact(contact);
      if (!normalizedContact.phone && !normalizedContact.email) {
        throwValidationError("An email address or WhatsApp phone number is required");
      } else if (existingContact) {
        await ctx.db.patch(existingContact._id, {
          ...normalizedContact,
          listing: updatedListing.title,
        });
      } else {
        await ctx.db.insert("RealestateContactInfo", {
          listingId,
          listing: updatedListing.title,
          ...normalizedContact,
        });
      }
    } else if (existingContact && patch.title !== undefined) {
      await ctx.db.patch(existingContact._id, {
        listing: updatedListing.title,
      });
    }
    if (!isAdmin && listing.status !== "pending") {
      await notifyAdministratorsOfPendingPublication(ctx, {
        resourceType: "listing",
        title: updatedListing.title,
        authorName: ctx.user.name,
      });
    }
    return null;
  },
});
