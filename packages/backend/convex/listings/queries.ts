import {
  FilterBuilder,
  OrderedQuery,
  paginationOptsValidator,
  Query,
  QueryInitializer,
} from "convex/server";
import { v } from "convex/values";
import { DataModel, Id } from "../_generated/dataModel";
import {
  isPublicPublicationStatus,
  requiresPublicationModeration,
  type PublicationStatus,
} from "@hallomada/shared/publication-lifecycle";
import { authComponent } from "../auth/auth";
import { query } from "../functions";
import { getPublicAuthorSlug } from "../posts/publicAuthorSlug";
import { r2 } from "../integrations/r2";
import { resolveListingImages } from "./imageUrls";
import { redactSensitivePublicListingText } from "./privacy";

// Resolve R2 storageId keys to signed URLs.
// Falls back to the old Cloudinary secureUrl for existing records.
async function resolveImages(
  images: Array<{
    storageId?: string;
    url?: string;
    publicId?: string;
    secureUrl?: string;
  }>,
) {
  return await resolveListingImages(images, (key) => r2.getUrl(key));
}

/**
 * Precise map coordinates are sensitive listing data. Keep them out of every
 * public listing response so adding a new list or metadata query cannot expose
 * them by accident.
 */
function withoutSensitivePublicFields<
  T extends {
    location?: unknown;
    searchAll?: unknown;
    title: string;
    city: string;
    neighborhood?: string;
    description: string;
    extras?: string[];
  },
>(listing: T) {
  const { location, searchAll, ...publicListing } = listing;
  void location;
  void searchAll;
  return {
    ...publicListing,
    title: redactSensitivePublicListingText(publicListing.title),
    city: redactSensitivePublicListingText(publicListing.city),
    ...(publicListing.neighborhood !== undefined
      ? {
          neighborhood: redactSensitivePublicListingText(
            publicListing.neighborhood,
          ),
        }
      : {}),
    description: redactSensitivePublicListingText(publicListing.description),
    ...(publicListing.extras !== undefined
      ? {
          extras: publicListing.extras.map(redactSensitivePublicListingText),
        }
      : {}),
  };
}

function approximateLocation(location: { lat: number; lng: number } | undefined) {
  if (!location) return undefined;
  return {
    lat: Math.round(location.lat * 100) / 100,
    lng: Math.round(location.lng * 100) / 100,
  };
}

function isVisibleListing(
  listing: { status?: PublicationStatus; authorId: string },
  userId?: string,
) {
  return (
    isPublicPublicationStatus(listing.status) ||
    (listing.status === "pending" && listing.authorId === userId)
  );
}

function isListingHiddenFromPublic(status: PublicationStatus | undefined) {
  return status === "archived" || requiresPublicationModeration(status);
}

function visibleListingFilter(
  q: FilterBuilder<DataModel["RealestateListing"]>,
  userId?: string,
) {
  const publiclyVisible = q.or(
    q.eq(q.field("status"), "active"),
    q.eq(q.field("status"), undefined),
  );
  if (!userId) return publiclyVisible;

  return q.or(
    publiclyVisible,
    q.and(
      q.eq(q.field("status"), "pending"),
      q.eq(q.field("authorId"), userId),
    ),
  );
}

function canManageListing(
  listing: { authorId: string },
  user: { _id: string; role?: string | null } | null | undefined,
) {
  return user?._id === listing.authorId || user?.role === "admin";
}

export const getListingWithContact = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const listing = await ctx.db
      .query("RealestateListing")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!listing) return null;

    const user = await authComponent.safeGetAuthUser(ctx);
    if (
      isListingHiddenFromPublic(listing.status) &&
      !canManageListing(listing, user)
    ) {
      return null;
    }
    let isBookmarked = false;
    if (user) {
      const existingBookmark = await ctx.db
        .query("bookmarks")
        .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
          q
            .eq("userId", user._id)
            .eq("resourceType", "realEstate")
            .eq("resourceId", listing._id),
        )
        .unique();
      if (existingBookmark) isBookmarked = true;
    }

    // get contact information via the index
    const contact = await ctx.db
      .query("RealestateContactInfo")
      .withIndex("by_listingId", (q) => q.eq("listingId", listing._id))
      .unique(); // Use .unique() if an ad has only one contact block.

    const images = await resolveImages(listing.images ?? []);

    const canSeeContact = user?.emailVerified === true;

    return {
      ...withoutSensitivePublicFields(listing),
      images,
      isBookmarked,
      authorSlug: await getPublicAuthorSlug(ctx, listing.authorId),
      // The detail page can show an optional map for everyone, but only with a
      // deliberately rounded position. Contact information remains verified-only.
      ...(listing.location
        ? { location: approximateLocation(listing.location) }
        : {}),
      contact: canSeeContact && contact ? { email: contact.email, phone: contact.phone } : null,
      contactAccessRequired: !canSeeContact && Boolean(contact?.email || contact?.phone),
      contactVerificationRequired: Boolean(user && !user.emailVerified && (contact?.email || contact?.phone)),
    };
  },
});

export const getListingLocationForEdit = query({
  args: { id: v.id("RealestateListing") },
  returns: v.union(
    v.object({
      location: v.union(
        v.object({ lat: v.number(), lng: v.number() }),
        v.null(),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, { id }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const listing = await ctx.db.get(id);
    if (!listing || listing.authorId !== user._id) return null;

    return { location: listing.location ?? null };
  },
});

export const getListingMetadata = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const listing = await ctx.db
      .query("RealestateListing")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (!listing) return null;
    const user = await authComponent.safeGetAuthUser(ctx);
    if (
      isListingHiddenFromPublic(listing.status) &&
      !canManageListing(listing, user)
    ) {
      return null;
    }
    return {
      ...withoutSensitivePublicFields(listing),
      images: await resolveImages(listing.images ?? []),
    };
  },
});

export const getListing = query({
  args: {
    paginationOpts: paginationOptsValidator,
    searchTerm: v.optional(v.string()),
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
    bedrooms: v.optional(v.number()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    bookmarkedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const {
      searchTerm,
      propertyType,
      listingMode,
      bedrooms,
      minPrice,
      maxPrice,
      bookmarkedOnly,
    } = args;
    const user = await authComponent.safeGetAuthUser(ctx);

    if (bookmarkedOnly) {
      if (!user) return { page: [], isDone: true, continueCursor: "" };
      const bookmarksPage = await ctx.db
        .query("bookmarks")
        .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
          q.eq("userId", user._id).eq("resourceType", "realEstate"),
        )
        .order("desc")
        .paginate(args.paginationOpts);

      const enrichedPage = await Promise.all(
        bookmarksPage.page.map(async (b) => {
          const listing = await ctx.db.get(
            b.resourceId as Id<"RealestateListing">,
          );
          if (!listing) return null;
          return {
            ...withoutSensitivePublicFields(listing),
            isBookmarked: true,
          } as Omit<typeof listing, "location"> & {
            isBookmarked: boolean;
          };
        }),
      );

      const filteredPage = enrichedPage.filter(
        (j): j is NonNullable<typeof j> =>
          j !== null && isVisibleListing(j, user._id),
      );
      return { ...bookmarksPage, page: filteredPage };
    }

    // Step 1: table
    const tableQuery: QueryInitializer<DataModel["RealestateListing"]> =
      ctx.db.query("RealestateListing");

    let orderedQuery: OrderedQuery<DataModel["RealestateListing"]>;

    if (searchTerm && searchTerm.trim() !== "") {
      // Steps 2+3: search index (already includes the order)
      orderedQuery = tableQuery.withSearchIndex("search_all_fields", (q) => {
        let search = q.search("searchAll", searchTerm);
        if (propertyType) search = search.eq("propertyType", propertyType);
        if (bedrooms && bedrooms > 0) search = search.eq("bedrooms", bedrooms);
        return search;
      });
    } else {
      // Step 2: Standard index or no index
      // Newest (or most recently bumped) first.
      let indexedQuery: Query<DataModel["RealestateListing"]> =
        tableQuery.withIndex("by_listedAt");
      if (propertyType) {
        indexedQuery = tableQuery.withIndex("by_propertyType_and_listedAt", (q) =>
          q.eq("propertyType", propertyType),
        );
      }

      // Step 3: Order
      orderedQuery = indexedQuery.order("desc");
    }

    // Step 4: Additional filters
    const filtered = orderedQuery.filter((q) => {
      let expr = visibleListingFilter(q, user?._id);

      if (minPrice !== undefined) {
        expr = q.and(expr, q.gte(q.field("price"), minPrice));
      }
      if (maxPrice !== undefined) {
        expr = q.and(expr, q.lte(q.field("price"), maxPrice));
      }
      if (listingMode) {
        expr = q.and(expr, q.eq(q.field("listingMode"), listingMode));
      }
      if (!searchTerm && bedrooms && bedrooms > 0) {
        expr = q.and(expr, q.eq(q.field("bedrooms"), bedrooms));
      }

      return expr;
    });

    // Step 5: Pagination
    const results = await filtered.paginate(args.paginationOpts);

    const enrichedPage = await Promise.all(
      results.page.map(async (listing) => {
        let isBookmarked = false;
        if (user) {
          const existingBookmark = await ctx.db
            .query("bookmarks")
            .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
              q
                .eq("userId", user._id)
                .eq("resourceType", "realEstate")
                .eq("resourceId", listing._id),
            )
            .unique();
          if (existingBookmark) isBookmarked = true;
        }
        const images = await resolveImages(listing.images ?? []);
        return {
          ...withoutSensitivePublicFields(listing),
          images,
          isBookmarked,
        };
      }),
    );

    return { ...results, page: enrichedPage };
  },
});

export const listListingsByCity = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("RealestateListing")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .order("desc")
      .filter(visibleListingFilter)
      .take(50);

    return Promise.all(
      listings.map(async (listing) => {
        const images = await resolveImages(listing.images ?? []);
        return { ...withoutSensitivePublicFields(listing), images };
      }),
    );
  },
});

export const getSimilarRealEstateListings = query({
  args: {
    excludeSlug: v.string(),
    city: v.string(),
    propertyType: v.union(
      v.literal("room"),
      v.literal("apartment"),
      v.literal("house"),
      v.literal("studio"),
      v.literal("shared"),
    ),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const byCity = await ctx.db
      .query("RealestateListing")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .filter((q) =>
        q.and(
          q.neq(q.field("slug"), args.excludeSlug),
          visibleListingFilter(q),
        ),
      )
      .order("desc")
      .take(args.limit);

    if (byCity.length >= args.limit) {
      return Promise.all(
        byCity.map(async (listing) => {
          const images = await resolveImages(listing.images ?? []);
          return { ...withoutSensitivePublicFields(listing), images };
        }),
      );
    }

    const remaining = args.limit - byCity.length;

    const byType = await ctx.db
      .query("RealestateListing")
      .withIndex("by_propertyType", (q) =>
        q.eq("propertyType", args.propertyType),
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("slug"), args.excludeSlug),
          q.neq(q.field("city"), args.city), // Avoid duplicates; city already taken.
          visibleListingFilter(q),
        ),
      )
      .order("desc")
      .take(remaining);

    const combined = [...byCity, ...byType];
    return Promise.all(
      combined.map(async (listing) => {
        const images = await resolveImages(listing.images ?? []);
        return { ...withoutSensitivePublicFields(listing), images };
      }),
    );
  },
});
