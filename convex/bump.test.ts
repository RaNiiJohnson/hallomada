/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import { BUMP_COOLDOWN_MS } from "./bump";

vi.mock("./aggregates", async () => {
  const { aggregatesMock } = await import("./test.aggregates.mock");
  return aggregatesMock;
});

const authState = vi.hoisted(() => ({
  user: { _id: "owner-1", id: "owner-1", name: "Owner", role: "user" },
}));

vi.mock("./auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auth/auth")>();
  return {
    ...actual,
    requireAuth: vi.fn(async () => ({ user: authState.user })),
    authComponent: {
      ...actual.authComponent,
      safeGetAuthUser: vi.fn(async () => null),
    },
  };
});

type T = ReturnType<typeof convexTest>;

async function insertListing(t: T, title: string, listedAt: number) {
  return await t.run(async (ctx) =>
    ctx.db.insert("RealestateListing", {
      title,
      propertyType: "room",
      listingMode: "rent",
      status: "active",
      slug: title,
      city: "Berlin",
      price: 450,
      currency: "EUR",
      period: "month",
      area: 15,
      bedrooms: 1,
      bathrooms: 1,
      floor: 1,
      pets: false,
      images: [],
      description: "Une chambre",
      extras: [],
      authorId: "owner-1",
      authorName: "Owner",
      updatedAt: listedAt,
      listedAt,
    }),
  );
}

async function titles(t: T, propertyType?: "room") {
  const result = await t.query(api.listings.queries.getListing, {
    paginationOpts: { cursor: null, numItems: 10 },
    propertyType,
  });
  return result.page.map((listing) => listing.title);
}

describe("bump", () => {
  let t: T;

  beforeEach(() => {
    authState.user._id = "owner-1";
    authState.user.id = "owner-1";
    t = convexTest(schema, modules);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("moves a listing back to the top, once a week", async () => {
    const old = await insertListing(t, "old", 1_000);
    await insertListing(t, "newer", 2_000);
    expect(await titles(t)).toEqual(["newer", "old"]);

    await t.mutation(api.bump.bump, { resource: { type: "listing", id: old } });
    expect(await titles(t)).toEqual(["old", "newer"]);
    expect(await titles(t, "room")).toEqual(["old", "newer"]);

    await expect(
      t.mutation(api.bump.bump, { resource: { type: "listing", id: old } }),
    ).rejects.toThrow("bumped recently");

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + BUMP_COOLDOWN_MS + 1);
    await expect(
      t.mutation(api.bump.bump, { resource: { type: "listing", id: old } }),
    ).resolves.toMatchObject({ nextBumpAt: expect.any(Number) });
  });

  it("is reserved to the owner of a published listing", async () => {
    const listing = await insertListing(t, "mine", 1_000);
    authState.user._id = "intruder";
    authState.user.id = "intruder";
    await expect(
      t.mutation(api.bump.bump, { resource: { type: "listing", id: listing } }),
    ).rejects.toThrow();

    authState.user._id = "owner-1";
    authState.user.id = "owner-1";
    await t.run(async (ctx) => ctx.db.patch(listing, { status: "closed" }));
    await expect(
      t.mutation(api.bump.bump, { resource: { type: "listing", id: listing } }),
    ).rejects.toThrow("published");
  });
});
