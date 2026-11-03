/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import { FEATURE_DURATION_MS } from "./featured";

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
  };
});

type T = ReturnType<typeof convexTest>;

async function insertListing(
  t: T,
  slug: string,
  status: "active" | "pending" = "active",
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("RealestateListing", {
      title: slug,
      propertyType: "room",
      listingMode: "rent",
      status,
      slug,
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
      updatedAt: Date.now(),
    }),
  );
}

describe("featured badge", () => {
  let t: T;

  beforeEach(() => {
    authState.user._id = "owner-1";
    authState.user.id = "owner-1";
    t = convexTest(schema, modules);
  });

  it("features one listing at a time for a week", async () => {
    const first = await insertListing(t, "first");
    const second = await insertListing(t, "second");

    const before = Date.now();
    const result = await t.mutation(api.featured.feature, {
      resource: { type: "listing", id: first },
    });
    expect(result.replacedTitle).toBeNull();
    expect(result.featuredUntil).toBeGreaterThanOrEqual(before + FEATURE_DURATION_MS);

    const moved = await t.mutation(api.featured.feature, {
      resource: { type: "listing", id: second },
    });
    expect(moved.replacedTitle).toBe("first");
    await t.run(async (ctx) => {
      expect((await ctx.db.get(first))?.featuredUntil).toBeUndefined();
      expect((await ctx.db.get(second))?.featuredUntil).toBe(moved.featuredUntil);
    });

    await t.mutation(api.featured.unfeature, {
      resource: { type: "listing", id: second },
    });
    await t.run(async (ctx) => {
      expect((await ctx.db.get(second))?.featuredUntil).toBeUndefined();
    });
  });

  it("refuses other members and unpublished listings", async () => {
    const pending = await insertListing(t, "pending", "pending");
    await expect(
      t.mutation(api.featured.feature, { resource: { type: "listing", id: pending } }),
    ).rejects.toThrow("published");

    const listing = await insertListing(t, "mine");
    authState.user._id = "intruder";
    authState.user.id = "intruder";
    await expect(
      t.mutation(api.featured.feature, { resource: { type: "listing", id: listing } }),
    ).rejects.toThrow();
  });
});
