/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { authComponent, requireAuth } from "../auth/auth";
import schema from "../schema";
import { modules } from "../test.setup";

vi.mock("../posts/publicAuthorSlug", () => ({
  getPublicAuthorSlug: vi.fn(async () => "author-slug"),
}));

vi.mock("../notifications/admin", () => ({
  notifyAdministratorsOfPendingPublication: vi.fn(),
}));

vi.mock("../auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/auth")>();
  return {
    ...actual,
    requireAuth: vi.fn().mockResolvedValue({
      user: {
        _id: "testUserId",
        id: "testUserId",
        name: "Test User",
        userType: "provider",
      },
    }),
    authComponent: {
      ...actual.authComponent,
      safeGetAuthUser: vi.fn().mockResolvedValue({
        _id: "testUserId",
        name: "Test User",
        userType: "provider",
      }),
    },
  };
});

describe("Listings", () => {
  let t: ReturnType<typeof convexTest>;
  let listingId: Id<"RealestateListing">;
  let listingSlug: string;

  beforeEach(async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: {
        _id: "testUserId",
        id: "testUserId",
        name: "Test User",
        userType: "provider",
      },
    } as never);
    vi.mocked(authComponent.safeGetAuthUser).mockResolvedValue({
      _id: "testUserId",
      emailVerified: false,
    } as never);
    t = convexTest(schema, modules);

    listingId = await t.mutation(api.listings.mutations.createListing, {
      title: "Listing Title",
      propertyType: "apartment",
      listingMode: "rent",
      acceptsRentalFile: true,
      location: { lat: 0, lng: 0 },
      city: "City",
      price: 1000,
      charges: 100,
      deposit: 2000,
      area: 50,
      bedrooms: 2,
      bathrooms: 1,
      floor: 1,
      pets: false,
      images: [],
      description: "Listing Description",
      extras: [],
      availableFrom: 1_800_000_000_000,
      contact: { email: "provider@example.com" },
    });

    const listing = await t.run(async (ctx) => await ctx.db.get(listingId));
    listingSlug = listing!.slug;
    await t.run(async (ctx) => {
      await ctx.db.patch(listingId, { status: "active" });
    });
  });

  it("should have created a listing", async () => {
    const result = await t.query(api.listings.queries.getListingWithContact, {
      slug: listingSlug,
    });
    expect(result?.title).toBe("Listing Title");
    expect(result?.contact).toBeNull();
    expect(result?.authorSlug).toBe("author-slug");
  });

  it("keeps contact details and precise coordinates out of public responses", async () => {
    const contactListingId = await t.mutation(
      api.listings.mutations.createListing,
      {
        title: "Contact Listing",
        propertyType: "studio",
        listingMode: "rent",
        acceptsRentalFile: true,
        city: "Berlin",
        location: { lat: 52.52, lng: 13.405 },
        price: 900,
        availableFrom: 1_800_000_000_000,
        area: 30,
        bedrooms: 1,
        bathrooms: 1,
        floor: 2,
        pets: false,
        images: [],
        description: "A listing with contact details",
        extras: [],
        contact: {
          phone: "+49 151 23456789",
          email: "Owner@Example.com",
        },
      },
    );
    const listing = await t.run(async (ctx) =>
      await ctx.db.get(contactListingId),
    );
    await t.run(async (ctx) => {
      await ctx.db.patch(contactListingId, { status: "active" });
    });

    const result = await t.query(api.listings.queries.getListingWithContact, {
      slug: listing!.slug,
    });
    expect(result?.contact).toBeNull();
    expect(result?.contactAccessRequired).toBe(true);
    expect(result?.contactVerificationRequired).toBe(true);
    expect(result?.location).toEqual({ lat: 52.52, lng: 13.41 });
    await expect(
      t.query(api.listings.queries.getListingLocationForEdit, {
        id: contactListingId,
      }),
    ).resolves.toEqual({ location: { lat: 52.52, lng: 13.405 } });

    vi.mocked(authComponent.safeGetAuthUser).mockResolvedValue(null as never);
    const anonymousResult = await t.query(
      api.listings.queries.getListingWithContact,
      { slug: listing!.slug },
    );
    expect(anonymousResult?.contact).toBeNull();
    expect(anonymousResult?.location).toEqual({ lat: 52.52, lng: 13.41 });
    expect(anonymousResult?.contactAccessRequired).toBe(true);
    expect(anonymousResult?.contactVerificationRequired).toBe(false);
    await expect(
      t.query(api.listings.queries.getListingLocationForEdit, {
        id: contactListingId,
      }),
    ).resolves.toBeNull();

    vi.mocked(authComponent.safeGetAuthUser).mockResolvedValue({
      _id: "adminUserId",
      role: "admin",
    } as never);
    await expect(
      t.query(api.listings.queries.getListingLocationForEdit, {
        id: contactListingId,
      }),
    ).resolves.toBeNull();

    const cityResults = await t.query(
      api.listings.queries.listListingsByCity,
      { city: "Berlin" },
    );
    expect(cityResults[0]).not.toHaveProperty("contact");
    expect(cityResults[0]).not.toHaveProperty("location");

    const metadata = await t.query(api.listings.queries.getListingMetadata, {
      slug: listing!.slug,
    });
    expect(metadata).not.toHaveProperty("location");

    const paginatedResults = await t.query(api.listings.queries.getListing, {
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(paginatedResults.page[0]).not.toHaveProperty("location");

    const similarResults = await t.query(
      api.listings.queries.getSimilarRealEstateListings,
      {
        excludeSlug: listingSlug,
        city: "Berlin",
        propertyType: "studio",
        limit: 1,
      },
    );
    expect(similarResults[0]).not.toHaveProperty("location");

    vi.mocked(authComponent.safeGetAuthUser).mockResolvedValue({
      _id: "verifiedUserId",
      emailVerified: true,
    } as never);

    const verifiedResult = await t.query(
      api.listings.queries.getListingWithContact,
      { slug: listing!.slug },
    );
    expect(verifiedResult?.contact).toMatchObject({
      phone: "+49 151 23456789",
      email: "owner@example.com",
    });
    expect(verifiedResult?.location).toEqual({ lat: 52.52, lng: 13.41 });
  });

  it("rejects malformed contact details", async () => {
    await expect(
      t.mutation(api.listings.mutations.updateListing, {
        listingId,
        patch: {},
        contact: { email: "not-an-email" },
      }),
    ).rejects.toThrow("Invalid contact email");

    await expect(
      t.mutation(api.listings.mutations.updateListing, {
        listingId,
        patch: {},
        contact: { phone: "call-me" },
      }),
    ).rejects.toThrow("Invalid contact phone number");
  });

  it("requires an email address or WhatsApp number for a new listing", async () => {
    await expect(
      t.mutation(api.listings.mutations.createListing, {
        title: "No contact listing",
        propertyType: "studio",
        listingMode: "rent",
        acceptsRentalFile: true,
        city: "Berlin",
        price: 900,
        availableFrom: 1_800_000_000_000,
        area: 30,
        bedrooms: 1,
        bathrooms: 1,
        floor: 2,
        pets: false,
        images: [],
        description: "A listing that intentionally omits contact details",
        extras: [],
      }),
    ).rejects.toThrow("An email address or WhatsApp phone number is required");
  });

  it("rejects contact details and precise locations in public listing text", async () => {
    await expect(
      t.mutation(api.listings.mutations.updateListing, {
        listingId,
        patch: { description: "Write to owner@example.com or call +49 151 23456789" },
      }),
    ).rejects.toThrow("Public listing text must not include contact details");

    await expect(
      t.mutation(api.listings.mutations.updateListing, {
        listingId,
        patch: { description: "Exact position: 52.5200, 13.4050" },
      }),
    ).rejects.toThrow("Public listing text must not include contact details");

    await expect(
      t.mutation(api.listings.mutations.updateListing, {
        listingId,
        patch: { neighborhood: "Hauptstraße 42" },
      }),
    ).rejects.toThrow("Public listing text must not include contact details");

    await expect(
      t.mutation(api.listings.mutations.updateListing, {
        listingId,
        patch: { neighborhood: "Hauptstr. 12" },
      }),
    ).rejects.toThrow("Public listing text must not include contact details");
  });

  it("enforces a non-blank city on the server", async () => {
    await expect(
      t.mutation(api.listings.mutations.createListing, {
        title: "No city listing",
        propertyType: "studio",
        listingMode: "rent",
        acceptsRentalFile: true,
        city: " ",
        price: 900,
        availableFrom: 1_800_000_000_000,
        area: 30,
        bedrooms: 1,
        bathrooms: 1,
        floor: 2,
        pets: false,
        images: [],
        description: "A listing without a city.",
        extras: [],
        contact: { email: "owner@example.com" },
      }),
    ).rejects.toThrow("City is required");

    await expect(
      t.mutation(api.listings.mutations.updateListing, {
        listingId,
        patch: { city: " " },
      }),
    ).rejects.toThrow("City is required");
  });

  it("redacts sensitive text in legacy listings returned publicly", async () => {
    await t.run(async (ctx) => {
      await ctx.db.patch(listingId, {
        title: "Hauptstraße 42 apartment",
        neighborhood: "Rue Victor Hugo 4",
        description: "Contact owner@example.com or +49 151 23456789 at 52.5200, 13.4050.",
        extras: ["Meet at Hauptstr. 12"],
        searchAll: "owner@example.com +49 151 23456789 52.5200, 13.4050",
      });
    });

    const publicListing = await t.query(
      api.listings.queries.getListingWithContact,
      { slug: listingSlug },
    );
    const publicText = JSON.stringify(publicListing);
    expect(publicText).not.toContain("owner@example.com");
    expect(publicText).not.toContain("+49 151 23456789");
    expect(publicText).not.toContain("52.5200, 13.4050");
    expect(publicText).not.toContain("Hauptstraße 42");
    expect(publicListing).not.toHaveProperty("searchAll");

    const results = await t.query(api.listings.queries.getListing, {
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(JSON.stringify(results.page)).not.toContain("owner@example.com");
    expect(JSON.stringify(results.page)).not.toContain("Hauptstraße 42");
  });

  it("upserts contact details and prevents removing the last contact method", async () => {
    await t.mutation(api.listings.mutations.updateListing, {
      listingId,
      patch: {},
      contact: { email: "owner@example.com" },
    });
    expect(
      (
        await t.query(api.listings.queries.getListingWithContact, {
          slug: listingSlug,
        })
      )?.contact?.email,
    ).toBeUndefined();

    await expect(
      t.mutation(api.listings.mutations.updateListing, {
        listingId,
        patch: {},
        contact: {},
      }),
    ).rejects.toThrow("An email address or WhatsApp phone number is required");
  });

  it("updates a listing and clears optional fields", async () => {
    await t.mutation(api.listings.mutations.updateListing, {
      listingId,
      patch: {
        title: "Updated Listing",
        location: null,
        charges: null,
        deposit: null,
        availableFrom: null,
      },
    });

    const listing = await t.run(async (ctx) => await ctx.db.get(listingId));

    expect(listing?.title).toBe("Updated Listing");
    expect(listing?.location).toBeUndefined();
    expect(listing?.charges).toBeUndefined();
    expect(listing?.deposit).toBeUndefined();
    expect(listing?.availableFrom).toBeUndefined();
    expect(listing?.searchAll).toContain("Updated Listing");

    const publicListing = await t.query(
      api.listings.queries.getListingWithContact,
      { slug: listing!.slug },
    );
    expect(publicListing).not.toHaveProperty("location");
  });

  it("keeps rental deposits out of listings for sale", async () => {
    const saleListingId = await t.mutation(api.listings.mutations.createListing, {
      title: "Listing for sale",
      propertyType: "house",
      listingMode: "sale",
      city: "Munich",
      price: 450_000,
      charges: 200,
      deposit: 3_000,
      availableFrom: 1_800_000_000_000,
      area: 100,
      bedrooms: 4,
      bathrooms: 2,
      floor: 0,
      pets: true,
      images: [],
      description: "A house offered for sale",
      extras: [],
      contact: { phone: "+49 151 23456789" },
    });

    await t.mutation(api.listings.mutations.updateListing, {
      listingId,
      patch: {
        listingMode: "sale",
        charges: 150,
        deposit: 2_000,
        availableFrom: 1_800_000_000_000,
      },
    });

    await t.run(async (ctx) => {
      const saleListing = await ctx.db.get(saleListingId);
      const convertedListing = await ctx.db.get(listingId);

      expect(saleListing?.deposit).toBeUndefined();
      expect(saleListing?.charges).toBe(200);
      expect(saleListing?.availableFrom).toBe(1_800_000_000_000);
      expect(convertedListing?.deposit).toBeUndefined();
      expect(convertedListing?.charges).toBe(150);
      expect(convertedListing?.availableFrom).toBe(1_800_000_000_000);
    });
  });

  it("keeps a closed listing accessible but out of public results", async () => {
    await t.mutation(api.listings.mutations.setListingStatus, {
      listingId,
      status: "closed",
    });

    await expect(
      t.query(api.listings.queries.getListingWithContact, { slug: listingSlug }),
    ).resolves.toMatchObject({ status: "closed" });

    const results = await t.query(api.listings.queries.getListing, {
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(results.page.map((listing) => listing._id)).not.toContain(listingId);

    const cityResults = await t.query(
      api.listings.queries.listListingsByCity,
      { city: "City" },
    );
    expect(cityResults.map((listing) => listing._id)).not.toContain(listingId);
  });

  it("archives a listing without deleting its associated records", async () => {
    const descendants = await t.run(async (ctx) => {
      const translationId = await ctx.db.insert("listingTranslations", {
        listingId,
        language: "en",
        title: "Translation",
        city: "City",
        description: "Description",
        sourceUpdatedAt: Date.now(),
      });
      const contactId = await ctx.db.insert("RealestateContactInfo", {
        listingId,
        listing: "Listing Title",
        email: "owner@example.com",
      });
      const bookmarkId = await ctx.db.insert("bookmarks", {
        userId: "bookmark-owner",
        resourceId: listingId,
        resourceType: "realEstate",
      });
      return { translationId, contactId, bookmarkId };
    });

    await t.mutation(api.listings.mutations.setListingStatus, {
      listingId,
      status: "closed",
    });
    await t.mutation(api.listings.mutations.archiveListing, { listingId });

    await t.run(async (ctx) => {
      expect((await ctx.db.get(listingId))?.status).toBe("archived");
      for (const id of Object.values(descendants)) {
        expect(await ctx.db.get(id)).not.toBeNull();
      }
    });
  });

  it("hides archived listings from other members", async () => {
    await t.mutation(api.listings.mutations.setListingStatus, {
      listingId,
      status: "closed",
    });
    await t.mutation(api.listings.mutations.setListingStatus, {
      listingId,
      status: "archived",
    });
    vi.mocked(authComponent.safeGetAuthUser).mockResolvedValue({
      _id: "anotherUserId",
      emailVerified: true,
    } as never);

    await expect(
      t.query(api.listings.queries.getListingWithContact, { slug: listingSlug }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.listings.queries.getListingMetadata, { slug: listingSlug }),
    ).resolves.toBeNull();
  });

  it("enforces the active, closed, archived lifecycle on the server", async () => {
    await expect(
      t.mutation(api.listings.mutations.setListingStatus, {
        listingId,
        status: "archived",
      }),
    ).rejects.toThrow("Invalid listing status transition");

    await expect(
      t.mutation(api.listings.mutations.archiveListing, { listingId }),
    ).rejects.toThrow("Listing must be closed before it can be archived");

    await t.mutation(api.listings.mutations.setListingStatus, {
      listingId,
      status: "closed",
    });
    await t.mutation(api.listings.mutations.setListingStatus, {
      listingId,
      status: "archived",
    });
    await t.mutation(api.listings.mutations.setListingStatus, {
      listingId,
      status: "pending",
    });

    expect((await t.run((ctx) => ctx.db.get(listingId)))?.status).toBe(
      "pending",
    );
  });

  it("refuses lifecycle changes by another member", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: { _id: "anotherUserId", role: "user" },
    } as never);

    await expect(
      t.mutation(api.listings.mutations.setListingStatus, {
        listingId,
        status: "closed",
      }),
    ).rejects.toThrow("Not allowed to change this listing status");
  });

  it("refuses lifecycle changes by an administrator who is not the owner", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: { _id: "adminUserId", role: "admin" },
    } as never);

    await expect(
      t.mutation(api.listings.mutations.setListingStatus, {
        listingId,
        status: "closed",
      }),
    ).rejects.toThrow("Not allowed to change this listing status");
  });

  describe("input validation", () => {
    const base = {
      title: "Validated listing",
      propertyType: "apartment" as const,
      listingMode: "rent" as const,
      acceptsRentalFile: true,
      city: "Berlin",
      price: 900,
      area: 40,
      bedrooms: 1,
      bathrooms: 1,
      floor: 2,
      pets: false,
      images: [],
      description: "A listing used to check validation.",
      extras: [],
      availableFrom: 1_800_000_000_000,
      contact: { email: "provider@example.com" },
    };

    it("rejects negative, infinite and absurd amounts", async () => {
      for (const override of [
        { price: -1 },
        { price: Infinity },
        { price: 1e12 },
        { charges: -5 },
        { deposit: 1e12 },
      ]) {
        await expect(
          t.mutation(api.listings.mutations.createListing, {
            ...base,
            ...override,
          }),
        ).rejects.toThrow("Amounts must be positive");
      }
    });

    it("rejects impossible areas, room counts and floors", async () => {
      await expect(
        t.mutation(api.listings.mutations.createListing, { ...base, area: 0 }),
      ).rejects.toThrow("Area must be");
      await expect(
        t.mutation(api.listings.mutations.createListing, {
          ...base,
          bedrooms: 1.5,
        }),
      ).rejects.toThrow("whole numbers");
      await expect(
        t.mutation(api.listings.mutations.createListing, {
          ...base,
          bathrooms: -1,
        }),
      ).rejects.toThrow("whole numbers");
      await expect(
        t.mutation(api.listings.mutations.createListing, {
          ...base,
          floor: 5000,
        }),
      ).rejects.toThrow("Floor must be");
    });

    it("caps the number of photos", async () => {
      const images = Array.from({ length: 11 }, (_, index) => ({
        url: `https://example.test/${index}.jpg`,
      }));
      await expect(
        t.mutation(api.listings.mutations.createListing, { ...base, images }),
      ).rejects.toThrow("more than 10 photos");
    });

    it("only requires an availability date for rentals", async () => {
      const withoutDate: Omit<typeof base, "availableFrom"> & {
        availableFrom?: number;
      } = { ...base, availableFrom: undefined };
      await expect(
        t.mutation(api.listings.mutations.createListing, withoutDate),
      ).rejects.toThrow("Availability date is required");
      await expect(
        t.mutation(api.listings.mutations.createListing, {
          ...withoutDate,
          listingMode: "sale",
        }),
      ).resolves.toBeDefined();
    });

    it("makes a rental owner choose between a dossier and contact only", async () => {
      await expect(
        t.mutation(api.listings.mutations.createListing, {
          ...base,
          acceptsRentalFile: undefined,
        }),
      ).rejects.toThrow("Choose between a rental dossier and contact only");
      const contactOnly = await t.mutation(api.listings.mutations.createListing, {
        ...base,
        acceptsRentalFile: false,
      });
      const stored = await t.run((ctx) => ctx.db.get(contactOnly));
      expect(stored?.acceptsRentalFile).toBe(false);
    });

    it("applies the same bounds when updating", async () => {
      await expect(
        t.mutation(api.listings.mutations.updateListing, {
          listingId,
          patch: { price: -10 },
        }),
      ).rejects.toThrow("Amounts must be positive");
    });
  });
});
