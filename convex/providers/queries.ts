import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { query } from "../functions";
import { r2 } from "../integrations/r2";
import { getPublicAuthorSlug } from "../posts/publicAuthorSlug";
import { providerCategoryValidator } from "./values";

type ProviderDoc = Doc<"providers">;

async function imageUrl(image: { storageId: string } | undefined) {
  return image ? await r2.getUrl(image.storageId) : null;
}

/** Card data for the directory: no gallery, no contact links. */
async function toProviderCard(provider: ProviderDoc) {
  return {
    _id: provider._id,
    _creationTime: provider._creationTime,
    slug: provider.slug,
    name: provider.name,
    category: provider.category,
    tagline: provider.tagline,
    city: provider.city,
    serviceModes: provider.serviceModes,
    status: provider.status,
    logoUrl: await imageUrl(provider.logo),
    coverUrl: await imageUrl(provider.images[0]),
  };
}

async function toProviderPage(provider: ProviderDoc) {
  const { searchAll, ...rest } = provider;
  void searchAll;
  return {
    ...rest,
    logoUrl: await imageUrl(provider.logo),
    images: await Promise.all(
      provider.images.map(async (image) => ({
        storageId: image.storageId,
        url: await r2.getUrl(image.storageId),
      })),
    ),
  };
}

function canManage(
  provider: ProviderDoc,
  user: { _id: string; role?: string | null } | null | undefined,
) {
  return user?._id === provider.authorId || user?.role === "admin";
}

async function getVisibleBySlug(ctx: QueryCtx, slug: string) {
  const provider = await ctx.db
    .query("providers")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (!provider) return null;
  const user = await authComponent.safeGetAuthUser(ctx);
  if (provider.status !== "active" && !canManage(provider, user)) return null;
  return { provider, user };
}

export const listProviders = query({
  args: {
    paginationOpts: paginationOptsValidator,
    searchTerm: v.optional(v.string()),
    category: v.optional(providerCategoryValidator),
  },
  handler: async (ctx, { paginationOpts, searchTerm, category }) => {
    const term = searchTerm?.trim();
    const results = term
      ? await ctx.db
          .query("providers")
          .withSearchIndex("search_all_fields", (q) => {
            const search = q.search("searchAll", term).eq("status", "active");
            return category ? search.eq("category", category) : search;
          })
          .paginate(paginationOpts)
      : category
        ? await ctx.db
            .query("providers")
            .withIndex("by_status_and_category", (q) =>
              q.eq("status", "active").eq("category", category),
            )
            .order("desc")
            .paginate(paginationOpts)
        : await ctx.db
            .query("providers")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .order("desc")
            .paginate(paginationOpts);

    // Authors see their own pages awaiting review, on top of the first page.
    const ownPending =
      paginationOpts.cursor === null
        ? await getOwnPendingProviders(ctx, { searchTerm: term, category })
        : [];
    const page = [...ownPending, ...results.page];

    return {
      ...results,
      page: await Promise.all(page.map(toProviderCard)),
    };
  },
});

async function getOwnPendingProviders(
  ctx: QueryCtx,
  filters: { searchTerm?: string; category?: ProviderDoc["category"] },
) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) return [];
  const pending = await ctx.db
    .query("providers")
    .withIndex("by_authorId_and_status", (q) =>
      q.eq("authorId", user._id).eq("status", "pending"),
    )
    .order("desc")
    .take(20);
  const words = filters.searchTerm?.toLowerCase().split(/\s+/) ?? [];
  return pending.filter(
    (provider) =>
      (!filters.category || provider.category === filters.category) &&
      words.every((word) => provider.searchAll.toLowerCase().includes(word)),
  );
}

export const getProviderBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const found = await getVisibleBySlug(ctx, slug);
    if (!found) return null;
    return {
      ...(await toProviderPage(found.provider)),
      canManage: canManage(found.provider, found.user),
      isAuthor: found.user?._id === found.provider.authorId,
      authorSlug: await getPublicAuthorSlug(ctx, found.provider.authorId),
    };
  },
});

export const getProviderMetadata = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const found = await getVisibleBySlug(ctx, slug);
    if (!found) return null;
    const { provider } = found;
    return {
      name: provider.name,
      tagline: provider.tagline,
      description: provider.description,
      city: provider.city,
      imageUrl:
        (await imageUrl(provider.images[0])) ?? (await imageUrl(provider.logo)),
    };
  },
});
