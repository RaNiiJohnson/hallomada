/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { comingSoon } from "../premium";
import schema from "../schema";
import { modules } from "../test.setup";
import { MAX_RENTAL_DOCUMENTS, RENTAL_ACCESS_MS } from "./values";

vi.mock("../aggregates", async () => {
  const { aggregatesMock } = await import("../test.aggregates.mock");
  return aggregatesMock;
});

const r2Mock = vi.hoisted(() => ({ deleteObject: vi.fn(), getUrl: vi.fn() }));
vi.mock("../integrations/r2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../integrations/r2")>();
  return { ...actual, r2: r2Mock };
});

vi.mock("../posts/publicAuthorSlug", () => ({
  getPublicAuthorSlug: vi.fn(async () => null),
}));

const authState = vi.hoisted(() => ({
  user: { _id: "tenant-1", id: "tenant-1", name: "Rova", role: "user" },
}));

vi.mock("../auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/auth")>();
  return {
    ...actual,
    requireAuth: vi.fn(async () => ({ user: authState.user })),
    authComponent: {
      ...actual.authComponent,
      safeGetAuthUser: vi.fn(async () => ({
        _id: authState.user._id,
        name: authState.user.name,
      })),
    },
  };
});

function actAs(id: string, name = id) {
  authState.user._id = id;
  authState.user.id = id;
  authState.user.name = name;
}

type T = ReturnType<typeof convexTest>;

async function insertListing(t: T, authorId = "landlord-1", slug = "chambre-berlin") {
  return await t.run(async (ctx) => {
    const listingId = await ctx.db.insert("RealestateListing", {
      title: "Chambre à Berlin",
      propertyType: "room",
      listingMode: "rent",
      acceptsRentalFile: true,
      status: "active",
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
      authorId,
      authorName: "Landlord",
      updatedAt: Date.now(),
    });
    await ctx.db.insert("RealestateContactInfo", {
      listingId,
      listing: slug,
      email: "landlord@example.com",
    });
    return listingId;
  });
}

async function addDocument(t: T, userId: string, key = `rentalDocument/${Math.random()}.pdf`) {
  await t.run(async (ctx) => {
    await ctx.db.insert("uploadGrants", {
      key,
      userId,
      kind: "rentalDocument",
      expectedContentType: "application/pdf",
      maxSize: 10,
      verified: true,
    });
  });
  return await t.mutation(api.rentalFiles.mutations.attachDocument, {
    key,
    category: "payslip",
    fileName: "Gehalt.pdf",
  });
}

async function send(t: T, listingId: Id<"RealestateListing">, message?: string) {
  return await t.mutation(internal.rentalFiles.send.submit, { listingId, message });
}

describe("rental dossier", () => {
  let t: T;

  beforeEach(() => {
    actAs("tenant-1", "Rova");
    r2Mock.deleteObject.mockClear();
    t = convexTest(schema, modules);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves and validates the tenant profile", async () => {
    await t.mutation(api.rentalFiles.mutations.saveProfile, {
      profile: { occupation: " Infirmière ", householdSize: 2, moveInDate: "2027-01-01" },
    });
    const mine = await t.query(api.rentalFiles.queries.getMine, {});
    expect(mine.profile).toMatchObject({ occupation: "Infirmière", householdSize: 2 });

    await expect(
      t.mutation(api.rentalFiles.mutations.saveProfile, {
        profile: { householdSize: 0 },
      }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.rentalFiles.mutations.saveProfile, {
        profile: { moveInDate: "bientôt" },
      }),
    ).rejects.toThrow();
  });

  it("only attaches verified uploads of the current member, up to the limit", async () => {
    await t.run(async (ctx) => {
      await ctx.db.insert("uploadGrants", {
        key: "rentalDocument/other.pdf",
        userId: "someone-else",
        kind: "rentalDocument",
        expectedContentType: "application/pdf",
        maxSize: 10,
        verified: true,
      });
    });
    await expect(
      t.mutation(api.rentalFiles.mutations.attachDocument, {
        key: "rentalDocument/other.pdf",
        category: "id",
        fileName: "id.pdf",
      }),
    ).rejects.toThrow();

    for (let i = 0; i < MAX_RENTAL_DOCUMENTS; i++) await addDocument(t, "tenant-1");
    await expect(addDocument(t, "tenant-1")).rejects.toThrow();
  });

  it("deletes a document and its stored file, only for its owner", async () => {
    const documentId = await addDocument(t, "tenant-1", "rentalDocument/a.pdf");
    actAs("intruder");
    await expect(
      t.mutation(api.rentalFiles.mutations.removeDocument, { id: documentId }),
    ).rejects.toThrow();
    actAs("tenant-1");
    await t.mutation(api.rentalFiles.mutations.removeDocument, { id: documentId });
    expect(r2Mock.deleteObject).toHaveBeenCalledWith(expect.anything(), "rentalDocument/a.pdf");
  });

  afterEach(() => {
    comingSoon.highlightedApplications = false;
  });

  it("refuses a dossier for a listing that only wants to be contacted", async () => {
    const listingId = await insertListing(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(listingId, { acceptsRentalFile: false });
    });
    await addDocument(t, "tenant-1");
    await expect(send(t, listingId)).rejects.toThrow("does not ask for a rental dossier");
  });

  it("sends the dossier to a listing and shows it to the landlord", async () => {
    comingSoon.highlightedApplications = true;
    const listingId = await insertListing(t);
    await expect(send(t, listingId)).rejects.toThrow("no documents");

    await addDocument(t, "tenant-1");
    const sent = await send(t, listingId, "Bonjour !");
    expect(sent).toMatchObject({
      contactEmail: "landlord@example.com",
      highlighted: true,
      candidateName: "Rova",
    });
    await expect(send(t, listingId)).rejects.toThrow("already sent");
    await expect(
      t.query(api.rentalFiles.queries.hasSentToListing, { listingId }),
    ).resolves.toBe(true);

    // The landlord is notified and sees it in their list; others don't.
    await expect(
      t.query(api.rentalFiles.queries.listReceived, { listingId }),
    ).resolves.toBeNull();
    actAs("landlord-1");
    const received = await t.query(api.rentalFiles.queries.listReceived, { listingId });
    expect(received).toHaveLength(1);
    expect(received?.[0]).toMatchObject({ candidateName: "Rova", message: "Bonjour !" });
    const notifications = await t.run(async (ctx) =>
      (await ctx.db.query("notifications").take(10)).filter(
        (n) => n.userId === "landlord-1",
      ),
    );
    expect(notifications.map((n) => n.type)).toEqual(["rental_file_received"]);

    const view = await t.query(api.rentalFiles.queries.viewByToken, {
      token: sent.token,
    });
    expect(view?.documents).toHaveLength(1);
    expect(view?.documents[0].url).toContain(`/rental-document?t=${sent.token}&d=`);
  });

  it("refuses to send a dossier to one's own listing", async () => {
    const listingId = await insertListing(t, "tenant-1");
    await addDocument(t, "tenant-1");
    await expect(send(t, listingId)).rejects.toThrow("own listing");
  });

  it("ends access when the tenant revokes it or when it expires", async () => {
    const listingId = await insertListing(t);
    const otherListing = await insertListing(t, "landlord-2", "studio-hamburg");
    await addDocument(t, "tenant-1");
    const first = await send(t, listingId);
    const second = await send(t, otherListing);

    const mine = await t.query(api.rentalFiles.queries.getMine, {});
    const firstApplication = mine.sent.find(
      (application) => application.listing?.slug === "chambre-berlin",
    )!;
    await t.mutation(api.rentalFiles.mutations.revokeAccess, {
      applicationId: firstApplication._id,
    });
    await expect(
      t.query(api.rentalFiles.queries.viewByToken, { token: first.token }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.rentalFiles.queries.viewByToken, { token: second.token }),
    ).resolves.not.toBeNull();

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + RENTAL_ACCESS_MS + 1000);
    await t.mutation(internal.rentalFiles.send.expireAccess, {});
    await expect(
      t.query(api.rentalFiles.queries.viewByToken, { token: second.token }),
    ).resolves.toBeNull();
  });
});
