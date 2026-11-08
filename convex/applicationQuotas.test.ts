/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import {
  APPLICATION_QUOTA_PERIOD,
  assertApplicationQuota,
  getApplicationUsage,
} from "./applicationQuotas";
import schema from "./schema";
import { modules } from "./test.setup";

const authState = vi.hoisted(() => ({ id: "user-1" }));
const premiumState = vi.hoisted(() => ({ on: false }));

vi.mock("./auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auth/auth")>();
  return {
    ...actual,
    authComponent: {
      ...actual.authComponent,
      safeGetAuthUser: vi.fn(async () => ({ _id: authState.id, name: "U" })),
    },
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

type T = ReturnType<typeof convexTest>;

async function addJobApplication(t: T, candidateId: string, appliedAt: number) {
  await t.run(async (ctx) => {
    const jobId = await ctx.db.insert("JobOffer", {
      title: "Job",
      type: "job",
      slug: `job-${Math.random()}`,
      city: "Berlin",
      company: "ACME",
      description: "d",
      authorId: "recruiter",
      updatedAt: Date.now(),
    });
    await ctx.db.insert("jobApplications", {
      jobId,
      candidateId,
      cvKey: "cv",
      appliedAt,
    });
  });
}

async function addDossier(t: T, candidateId: string, sentAt: number) {
  await t.run(async (ctx) => {
    const listingId = await ctx.db.insert("RealestateListing", {
      title: "Room",
      propertyType: "room",
      listingMode: "rent",
      acceptsRentalFile: true,
      slug: `room-${Math.random()}`,
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
      description: "d",
      extras: [],
      authorId: "landlord",
      authorName: "L",
      updatedAt: Date.now(),
    });
    await ctx.db.insert("rentalApplications", {
      listingId,
      candidateId,
      candidateName: "U",
      highlighted: false,
      token: `t-${Math.random()}`,
      sentAt,
      expiresAt: sentAt + 1000,
    });
  });
}

describe("application quota", () => {
  let t: T;
  const now = Date.now();

  beforeEach(() => {
    authState.id = "user-1";
    premiumState.on = false;
    t = convexTest(schema, modules);
  });

  it("counts job applications and rental dossiers together", async () => {
    await addJobApplication(t, "user-1", now - 1000);
    await addJobApplication(t, "user-1", now - 2000);
    await addDossier(t, "user-1", now - 3000);
    // Someone else's applications do not count.
    await addJobApplication(t, "user-2", now - 1000);

    const usage = await t.run((ctx) => getApplicationUsage(ctx, "user-1", now));
    expect(usage).toEqual({ limit: 5, used: 3, remaining: 2, resetsAt: null });
  });

  it("ignores applications older than 30 days", async () => {
    await addJobApplication(t, "user-1", now - APPLICATION_QUOTA_PERIOD - 1000);
    const usage = await t.run((ctx) => getApplicationUsage(ctx, "user-1", now));
    expect(usage.used).toBe(0);
  });

  it("blocks the 6th application and says when a credit frees up", async () => {
    const oldest = now - 10_000;
    await addJobApplication(t, "user-1", oldest);
    for (let i = 1; i < 5; i++) await addDossier(t, "user-1", now - i);

    const usage = await t.run((ctx) => getApplicationUsage(ctx, "user-1", now));
    expect(usage).toMatchObject({ used: 5, remaining: 0 });
    expect(usage.resetsAt).toBe(oldest + APPLICATION_QUOTA_PERIOD);
    await expect(
      t.run((ctx) => assertApplicationQuota(ctx, "user-1")),
    ).rejects.toThrow(/LIMIT_REACHED/);
  });

  it("never limits Premium members", async () => {
    premiumState.on = true;
    for (let i = 0; i < 8; i++) await addJobApplication(t, "user-1", now - i);
    const usage = await t.run((ctx) => getApplicationUsage(ctx, "user-1", now));
    expect(usage).toEqual({ limit: null, used: 0, remaining: null, resetsAt: null });
    await t.run((ctx) => assertApplicationQuota(ctx, "user-1"));
  });

  it("follows the number set by an administrator", async () => {
    await t.run((ctx) =>
      ctx.db.insert("planQuotas", {
        plan: "free",
        applicationsPerMonth: 2,
        updatedAt: now,
        updatedBy: "admin",
      }),
    );
    await addJobApplication(t, "user-1", now - 1);
    await addDossier(t, "user-1", now - 2);
    await expect(
      t.run((ctx) => assertApplicationQuota(ctx, "user-1")),
    ).rejects.toThrow(/LIMIT_REACHED/);
  });

  it("exposes the viewer's counter", async () => {
    await addJobApplication(t, "user-1", now - 1);
    expect(await t.query(api.applicationQuotas.getMine, { now })).toEqual({
      limit: 5,
      used: 1,
      remaining: 4,
      resetsAt: null,
    });
  });
});
