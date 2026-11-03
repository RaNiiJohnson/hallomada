/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";
import { limiter } from "./rateLimits";
import { dayKey, STATS_DAYS, VIEW_DEDUP_MS } from "./statsValues";

vi.mock("./aggregates", async () => {
  const { aggregatesMock } = await import("./test.aggregates.mock");
  return aggregatesMock;
});

const authState = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("./auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auth/auth")>();
  return {
    ...actual,
    authComponent: {
      ...actual.authComponent,
      safeGetAuthUser: vi.fn(async () =>
        authState.userId ? { _id: authState.userId, name: "User" } : null,
      ),
    },
  };
});

type T = ReturnType<typeof convexTest>;

async function insertListing(t: T) {
  return await t.run(async (ctx) =>
    ctx.db.insert("RealestateListing", {
      title: "Chambre",
      propertyType: "room",
      listingMode: "rent",
      status: "active",
      slug: "chambre",
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

describe("publication stats", () => {
  let t: T;

  beforeEach(() => {
    authState.userId = null;
    t = convexTest(schema, modules);
    // Rate limits are stubbed in tests; emulate "once per key per period".
    const lastSeen = new Map<string, number>();
    vi.mocked(limiter.limit).mockImplementation(async (_ctx, _name, options) => {
      const key = (options as { key: string }).key;
      const now = Date.now();
      const previous = lastSeen.get(key);
      if (previous !== undefined && now - previous < VIEW_DEDUP_MS) {
        return { ok: false, retryAfter: VIEW_DEDUP_MS - (now - previous) };
      }
      lastSeen.set(key, now);
      return { ok: true, retryAfter: undefined };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(limiter.limit).mockResolvedValue({ ok: true, retryAfter: 0 });
  });

  it("counts each visitor once per period, never the author", async () => {
    const id = await insertListing(t);
    const resource = { type: "listing" as const, id };
    await t.mutation(api.stats.recordView, { resource, visitorId: "visitor-aaaa" });
    await t.mutation(api.stats.recordView, { resource, visitorId: "visitor-aaaa" });
    await t.mutation(api.stats.recordView, { resource, visitorId: "visitor-bbbb" });
    authState.userId = "owner-1";
    await t.mutation(api.stats.recordView, { resource, visitorId: "visitor-owner" });

    const today = dayKey(Date.now());
    let stats = await t.query(api.stats.getForPublication, { resource, today });
    expect(stats).toMatchObject({ premium: true, totalViews: 2, last7Days: 2 });
    if (!stats || !stats.premium) throw new Error("expected stats");
    expect(stats.daily).toHaveLength(STATS_DAYS);
    expect(stats.daily.at(-1)).toEqual({ day: today, views: 2 });

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + VIEW_DEDUP_MS + 1000);
    authState.userId = null;
    await t.mutation(api.stats.recordView, { resource, visitorId: "visitor-aaaa" });
    authState.userId = "owner-1";
    stats = await t.query(api.stats.getForPublication, {
      resource,
      today: dayKey(Date.now()),
    });
    expect(stats).toMatchObject({ totalViews: 3 });
  });

  it("shows the stats to the owner only", async () => {
    const id = await insertListing(t);
    const resource = { type: "listing" as const, id };
    const today = dayKey(Date.now());
    await expect(t.query(api.stats.getForPublication, { resource, today })).resolves.toBeNull();
    authState.userId = "someone";
    await expect(t.query(api.stats.getForPublication, { resource, today })).resolves.toBeNull();
    authState.userId = "owner-1";
    await expect(
      t.query(api.stats.getForPublication, { resource, today }),
    ).resolves.toMatchObject({ premium: true, totalViews: 0, bookmarks: 0, responses: 0 });
  });
});
