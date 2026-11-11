/// <reference types="vite/client" />

import { DAY } from "@convex-dev/rate-limiter";
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import {
  consumePublicationQuota,
  DEFAULT_PLAN_QUOTAS,
} from "./publicationQuotas";
import { limiter } from "./rateLimits";
import schema from "./schema";
import { modules } from "./test.setup";

const authState = vi.hoisted(() => ({
  actor: {
    _id: "user-1",
    name: "User One",
    role: "user" as "user" | "admin",
  },
}));

const premiumState = vi.hoisted(() => ({ on: true }));

const rateState = vi.hoisted(() => ({ ok: true, retryAfter: 0 }));

vi.mock("./auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auth/auth")>();
  return {
    ...actual,
    requireAuth: vi.fn(async () => ({ user: authState.actor })),
    requireAdmin: vi.fn(async () => {
      if (authState.actor.role !== "admin") {
        throw new Error("Admin access required");
      }
      return { user: authState.actor };
    }),
  };
});

vi.mock("./premium", () => ({
  hasPremium: vi.fn(async () => premiumState.on),
  hasHighlight: vi.fn(async () => false),
  comingSoon: { highlightedApplications: false },
}));

vi.mock("./aggregates", async () => {
  const { aggregatesMock } = await import("./test.aggregates.mock");
  return aggregatesMock;
});

vi.mock("./rateLimits", () => ({
  limiter: {
    limit: vi.fn(async () => ({
      ok: rateState.ok,
      retryAfter: rateState.retryAfter,
    })),
  },
}));

describe("publication quotas", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    authState.actor.role = "user";
    rateState.ok = true;
    premiumState.on = true;
    rateState.retryAfter = 0;
    vi.mocked(limiter.limit).mockClear();
    t = convexTest(schema, modules);
  });

  it("falls back to the default numbers for both plans", async () => {
    authState.actor.role = "admin";
    expect(await t.query(api.publicationQuotas.get, {})).toEqual(
      DEFAULT_PLAN_QUOTAS,
    );
    // The pricing page reads the same numbers without being an admin.
    authState.actor.role = "user";
    expect(await t.query(api.publicationQuotas.getPublic, {})).toEqual(
      DEFAULT_PLAN_QUOTAS,
    );
  });

  it("lets only administrators change a plan's quotas, with validated values", async () => {
    const next = {
      plan: "free" as const,
      jobsPerMonth: 5,
      listingsPerMonth: 4,
      providersPerMonth: 2,
      applicationsPerMonth: 3,
    };
    await expect(
      t.mutation(api.publicationQuotas.update, next),
    ).rejects.toThrow("Admin access required");

    authState.actor.role = "admin";
    await expect(
      t.mutation(api.publicationQuotas.update, { ...next, jobsPerMonth: 0 }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.publicationQuotas.update, { ...next, jobsPerMonth: 1.5 }),
    ).rejects.toThrow();

    await t.mutation(api.publicationQuotas.update, next);
    await t.mutation(api.publicationQuotas.update, next);
    const quotas = await t.query(api.publicationQuotas.get, {});
    expect(quotas.free).toEqual({
      jobsPerMonth: 5,
      listingsPerMonth: 4,
      providersPerMonth: 2,
      applicationsPerMonth: 3,
    });
    // The other plan is untouched.
    expect(quotas.premium).toEqual(DEFAULT_PLAN_QUOTAS.premium);
    const rows = await t.run((ctx) => ctx.db.query("planQuotas").collect());
    expect(rows).toHaveLength(1);
  });

  it("enforces the member's plan numbers server-side", async () => {
    authState.actor.role = "admin";
    await t.mutation(api.publicationQuotas.update, {
      plan: "premium",
      jobsPerMonth: 7,
      listingsPerMonth: null,
      providersPerMonth: 9,
      applicationsPerMonth: null,
    });
    await t.mutation(api.publicationQuotas.update, {
      plan: "free",
      jobsPerMonth: 1,
      listingsPerMonth: 2,
      providersPerMonth: 3,
      applicationsPerMonth: 4,
    });

    premiumState.on = true;
    await t.run((ctx) => consumePublicationQuota(ctx, "job", "user-1"));
    expect(limiter.limit).toHaveBeenCalledWith(
      expect.anything(),
      "createJobPerUser",
      expect.objectContaining({
        key: "user-1",
        config: expect.objectContaining({
          kind: "fixed window",
          rate: 7,
          period: 30 * DAY,
        }),
      }),
    );

    // Premium listings are unlimited: only the burst bucket is consulted.
    vi.mocked(limiter.limit).mockClear();
    await t.run((ctx) => consumePublicationQuota(ctx, "listing", "user-1"));
    expect(vi.mocked(limiter.limit).mock.calls.map((call) => call[1])).toEqual([
      "publicationBurstPerUser",
    ]);

    premiumState.on = false;
    await t.run((ctx) => consumePublicationQuota(ctx, "provider", "user-1"));
    expect(limiter.limit).toHaveBeenCalledWith(
      expect.anything(),
      "createProviderPerUser",
      expect.objectContaining({
        config: expect.objectContaining({ rate: 3 }),
      }),
    );

    rateState.ok = false;
    rateState.retryAfter = 1234;
    await expect(
      t.run((ctx) => consumePublicationQuota(ctx, "listing", "user-1")),
    ).rejects.toThrow(/LIMIT_REACHED/);
  });

  it("keeps the anti-burst bucket even when the plan is unlimited", async () => {
    authState.actor.role = "admin";
    await t.mutation(api.publicationQuotas.update, {
      plan: "premium",
      jobsPerMonth: null,
      listingsPerMonth: null,
      providersPerMonth: null,
      applicationsPerMonth: null,
    });
    premiumState.on = true;
    rateState.ok = false;
    rateState.retryAfter = 600;
    await expect(
      t.run((ctx) => consumePublicationQuota(ctx, "job", "user-1")),
    ).rejects.toThrow(/LIMIT_REACHED/);
  });

  it("blocks community creation once the hidden rate limit is hit", async () => {
    rateState.ok = false;
    await expect(
      t.mutation(api.communities.mutations.createCommunity, {
        name: "Berlin",
        description: "Hallo Berlin",
        city: "Berlin",
      }),
    ).rejects.toThrow(/LIMIT_REACHED/);
    const rows = await t.run((ctx) => ctx.db.query("communities").collect());
    expect(rows).toHaveLength(0);
  });

  it("requires exactly one of city or theme and stores simple rules", async () => {
    await expect(
      t.mutation(api.communities.mutations.createCommunity, {
        name: "Nothing",
        description: "d",
      }),
    ).rejects.toThrow(/city or a theme/);
    await expect(
      t.mutation(api.communities.mutations.createCommunity, {
        name: "Both",
        description: "d",
        city: "Berlin",
        theme: "Food",
      }),
    ).rejects.toThrow(/city or a theme/);

    const { comId } = await t.mutation(
      api.communities.mutations.createCommunity,
      { name: "Cuisine", description: "d", theme: "Food", rules: " Be kind " },
    );
    const community = await t.run((ctx) => ctx.db.get(comId));
    expect(community).toMatchObject({
      kind: "theme",
      theme: "Food",
      rules: "Be kind",
    });
  });
});
