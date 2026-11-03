/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { modules } from "../test.setup";
import { MAX_ALERTS_PER_USER, normalizeCity } from "./values";

vi.mock("../aggregates", async () => {
  const { aggregatesMock } = await import("../test.aggregates.mock");
  return aggregatesMock;
});

vi.mock("../notifications/admin", () => ({
  notifyAdministratorsOfPendingPublication: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  actor: {
    _id: "seeker-1",
    id: "seeker-1",
    name: "Seeker",
    role: "user" as "user" | "admin",
    userType: "seeker",
  },
}));

vi.mock("../auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/auth")>();
  return {
    ...actual,
    requireAuth: vi.fn(async () => ({ user: authState.actor })),
    requireAdmin: vi.fn(async () => {
      if (authState.actor.role !== "admin") {
        throw new Error("Admin access required");
      }
      return { user: authState.actor };
    }),
    authComponent: {
      ...actual.authComponent,
      safeGetAuthUser: vi.fn(async () => authState.actor),
    },
  };
});

function actAs(id: string, role: "user" | "admin" = "user") {
  authState.actor._id = id;
  authState.actor.id = id;
  authState.actor.role = role;
}

type T = ReturnType<typeof convexTest>;

async function insertPendingListing(
  t: T,
  overrides: { city?: string; price?: number; authorId?: string } = {},
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("RealestateListing", {
      title: "Chambre à Berlin",
      propertyType: "room",
      listingMode: "rent",
      status: "pending",
      slug: `listing-${Math.random()}`,
      city: overrides.city ?? "Berlin",
      price: overrides.price ?? 450,
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
      authorId: overrides.authorId ?? "owner-1",
      authorName: "Owner",
      updatedAt: Date.now(),
    }),
  );
}

async function approve(t: T, id: Id<"RealestateListing">) {
  actAs("admin-1", "admin");
  await t.mutation(api.publicationModeration.decide, {
    resource: { type: "listing", id },
    decision: "approved",
  });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
}

async function alertNotifications(t: T, userId: string) {
  return await t.run(async (ctx) =>
    (await ctx.db.query("notifications").take(200)).filter(
      (n) =>
        n.userId === userId &&
        (n.type === "alert_listing" || n.type === "alert_job"),
    ),
  );
}

describe("search alerts", () => {
  let t: T;

  beforeEach(() => {
    vi.useFakeTimers();
    actAs("seeker-1");
    t = convexTest(schema, modules);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("normalizes cities so spelling differences still match", () => {
    expect(normalizeCity("  Münster ")).toBe("munster");
    expect(normalizeCity("Frankfurt  am Main")).toBe("frankfurt am main");
    expect(normalizeCity(undefined)).toBe("");
  });

  it("notifies matching alerts once the listing is approved", async () => {
    await t.mutation(api.alerts.mutations.create, {
      criteria: { kind: "listing", city: "berlin", maxPrice: 500, propertyType: "room" },
      email: false,
      locale: "fr",
    });
    actAs("seeker-2");
    await t.mutation(api.alerts.mutations.create, {
      criteria: { kind: "listing", city: "Berlin", maxPrice: 300 },
      email: false,
      locale: "fr",
    });
    actAs("seeker-3");
    await t.mutation(api.alerts.mutations.create, {
      criteria: { kind: "listing" },
      email: false,
      locale: "de",
    });
    actAs("seeker-4");
    await t.mutation(api.alerts.mutations.create, {
      criteria: { kind: "listing", city: "Hamburg" },
      email: false,
      locale: "en",
    });

    const listingId = await insertPendingListing(t, { price: 450 });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await alertNotifications(t, "seeker-1")).toHaveLength(0);

    await approve(t, listingId);

    const first = await alertNotifications(t, "seeker-1");
    expect(first).toHaveLength(1);
    expect(first[0].message).toBe("Chambre à Berlin");
    expect(first[0].targetHref).toMatch(/^\/listing\//);
    // Price above the alert's maximum.
    expect(await alertNotifications(t, "seeker-2")).toHaveLength(0);
    // "Any city" alert.
    expect(await alertNotifications(t, "seeker-3")).toHaveLength(1);
    // Other city.
    expect(await alertNotifications(t, "seeker-4")).toHaveLength(0);
  });

  it("notifies a member once even if several alerts match, and never the author", async () => {
    await t.mutation(api.alerts.mutations.create, {
      criteria: { kind: "listing", city: "Berlin" },
      email: false,
      locale: "fr",
    });
    await t.mutation(api.alerts.mutations.create, {
      criteria: { kind: "listing" },
      email: false,
      locale: "fr",
    });
    actAs("owner-1");
    await t.mutation(api.alerts.mutations.create, {
      criteria: { kind: "listing" },
      email: false,
      locale: "fr",
    });

    await approve(t, await insertPendingListing(t));

    expect(await alertNotifications(t, "seeker-1")).toHaveLength(1);
    expect(await alertNotifications(t, "owner-1")).toHaveLength(0);
  });

  it("ignores paused alerts and sends alerts only once per listing", async () => {
    const alertId = await t.mutation(api.alerts.mutations.create, {
      criteria: { kind: "listing" },
      email: false,
      locale: "fr",
    });
    await t.mutation(api.alerts.mutations.update, { id: alertId, paused: true });
    const listingId = await insertPendingListing(t);
    await approve(t, listingId);
    expect(await alertNotifications(t, "seeker-1")).toHaveLength(0);

    // Edited and approved again: alerts are not sent a second time.
    actAs("seeker-1");
    await t.mutation(api.alerts.mutations.update, { id: alertId, paused: false });
    await t.run(async (ctx) => ctx.db.patch(listingId, { status: "pending" }));
    await approve(t, listingId);
    expect(await alertNotifications(t, "seeker-1")).toHaveLength(0);
  });

  it("schedules an email when the alert asks for it", async () => {
    await t.mutation(api.alerts.mutations.create, {
      criteria: { kind: "listing" },
      email: true,
      locale: "fr",
    });
    const listingId = await insertPendingListing(t);
    actAs("admin-1", "admin");
    await t.mutation(api.publicationModeration.decide, {
      resource: { type: "listing", id: listingId },
      decision: "approved",
    });
    // Run the two matching steps (city, then any city) but not the email
    // action itself, which needs the real email provider.
    for (let step = 0; step < 2; step++) {
      vi.runOnlyPendingTimers();
      await t.finishInProgressScheduledFunctions();
    }

    const scheduled = await t.run(async (ctx) =>
      ctx.db.system.query("_scheduled_functions").take(20),
    );
    expect(scheduled.map((job) => job.name)).toContain(
      "alerts/emails:sendAlertEmail",
    );
  });

  it("enforces ownership and the per-member limit", async () => {
    const alertId = await t.mutation(api.alerts.mutations.create, {
      criteria: { kind: "job", city: "Köln", jobType: "job" },
      email: true,
      locale: "de",
    });
    await expect(t.query(api.alerts.queries.listMine, {})).resolves.toHaveLength(1);

    actAs("intruder");
    await expect(
      t.mutation(api.alerts.mutations.remove, { id: alertId }),
    ).rejects.toThrow();
    await expect(t.query(api.alerts.queries.listMine, {})).resolves.toHaveLength(0);

    for (let i = 0; i < MAX_ALERTS_PER_USER; i++) {
      await t.mutation(api.alerts.mutations.create, {
        criteria: { kind: "listing" },
        email: false,
        locale: "fr",
      });
    }
    await expect(
      t.mutation(api.alerts.mutations.create, {
        criteria: { kind: "listing" },
        email: false,
        locale: "fr",
      }),
    ).rejects.toThrow();
  });
});
