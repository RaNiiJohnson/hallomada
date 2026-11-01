/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import {
  consumePublicationQuota,
  DEFAULT_PUBLICATION_QUOTAS,
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
    rateState.retryAfter = 0;
    vi.mocked(limiter.limit).mockClear();
    t = convexTest(schema, modules);
  });

  it("falls back to 1 community per 30 days and 3 offers/listings per week", async () => {
    authState.actor.role = "admin";
    expect(await t.query(api.publicationQuotas.get, {})).toEqual(
      DEFAULT_PUBLICATION_QUOTAS,
    );
  });

  it("lets only administrators change quotas, with validated values", async () => {
    const next = { communityPer30Days: 2, jobsPerWeek: 5, listingsPerWeek: 4 };
    await expect(
      t.mutation(api.publicationQuotas.update, next),
    ).rejects.toThrow("Admin access required");

    authState.actor.role = "admin";
    await expect(
      t.mutation(api.publicationQuotas.update, { ...next, jobsPerWeek: 0 }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.publicationQuotas.update, { ...next, jobsPerWeek: 1.5 }),
    ).rejects.toThrow();

    await t.mutation(api.publicationQuotas.update, next);
    await t.mutation(api.publicationQuotas.update, next);
    expect(await t.query(api.publicationQuotas.get, {})).toEqual(next);
    const rows = await t.run((ctx) => ctx.db.query("publicationQuotas").collect());
    expect(rows).toHaveLength(1);
  });

  it("enforces the configured rate server-side", async () => {
    authState.actor.role = "admin";
    await t.mutation(api.publicationQuotas.update, {
      communityPer30Days: 2,
      jobsPerWeek: 5,
      listingsPerWeek: 4,
    });

    await t.run((ctx) => consumePublicationQuota(ctx, "job", "user-1"));
    expect(limiter.limit).toHaveBeenCalledWith(
      expect.anything(),
      "createJobPerUser",
      expect.objectContaining({
        key: "user-1",
        config: expect.objectContaining({ rate: 5 }),
      }),
    );

    rateState.ok = false;
    rateState.retryAfter = 1234;
    await expect(
      t.run((ctx) => consumePublicationQuota(ctx, "listing", "user-1")),
    ).rejects.toThrow(/LIMIT_REACHED/);
  });

  it("blocks community creation once the quota is exhausted", async () => {
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
