import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { isPublicProfilePost } from "./queries";

const authState = vi.hoisted(() => ({ userId: "member-a" as string | null }));

vi.mock("../auth/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/auth")>();
  return {
    ...actual,
    authComponent: {
      ...actual.authComponent,
      safeGetAuthUser: vi.fn().mockImplementation(async () =>
        authState.userId ? { _id: authState.userId } : null,
      ),
    },
  };
});

describe("personal space queries", () => {
  it("never exposes a private or secret community post on a public profile", () => {
    const post = { scope: "community", communityId: "community_1" } as Pick<
      import("../_generated/dataModel").Doc<"posts">,
      "scope" | "communityId"
    >;

    expect(isPublicProfilePost(post, { privacy: "public" })).toBe(true);
    expect(isPublicProfilePost(post, { privacy: "private" })).toBe(false);
    expect(isPublicProfilePost(post, { privacy: "secret" })).toBe(false);
    expect(isPublicProfilePost(post, null)).toBe(false);
  });

  it("treats legacy posts linked to a community as community content", () => {
    const legacyPost = { communityId: "community_1" } as Pick<
      import("../_generated/dataModel").Doc<"posts">,
      "scope" | "communityId"
    >;

    expect(isPublicProfilePost(legacyPost, { privacy: "public" })).toBe(true);
    expect(isPublicProfilePost(legacyPost, { privacy: "private" })).toBe(false);
    expect(isPublicProfilePost(legacyPost, { privacy: "secret" })).toBe(false);
    expect(isPublicProfilePost(legacyPost, null)).toBe(false);
  });

  it("only returns the signed-in member's applications and never exposes their CV key", async () => {
    const t = convexTest(schema, modules);
    const [myJobId, otherJobId] = await t.run(async (ctx) => {
      const myJobId = await ctx.db.insert("JobOffer", {
        title: "My job",
        type: "job",
        slug: "my-job",
        contractType: "CDI",
        city: "Berlin",
        company: "Hallomada",
        description: "A job",
        authorId: "employer-a",
        updatedAt: 1,
      });
      const otherJobId = await ctx.db.insert("JobOffer", {
        title: "Other job",
        type: "job",
        slug: "other-job",
        contractType: "CDI",
        city: "Berlin",
        company: "Other company",
        description: "Another job",
        authorId: "employer-b",
        updatedAt: 1,
      });
      await ctx.db.insert("jobApplications", {
        jobId: myJobId,
        candidateId: "member-a",
        cvKey: "cv/member-a-private.pdf",
        appliedAt: 1,
        emailStatus: "sent",
      });
      await ctx.db.insert("jobApplications", {
        jobId: otherJobId,
        candidateId: "member-b",
        cvKey: "cv/member-b-private.pdf",
        appliedAt: 2,
        emailStatus: "sent",
      });
      return [myJobId, otherJobId];
    });
    void myJobId;
    void otherJobId;

    const result = await t.query(api.me.queries.getMyApplications, {
      paginationOpts: { cursor: null, numItems: 10 },
    });

    expect(result.page).toEqual([
      expect.objectContaining({
        job: { title: "My job", slug: "my-job", company: "Hallomada" },
        emailStatus: "sent",
      }),
    ]);
    expect(result.page[0]).not.toHaveProperty("cvKey");
    expect(JSON.stringify(result)).not.toContain("member-b-private");
  });

  it("returns an empty personal page to visitors", async () => {
    authState.userId = null;
    const t = convexTest(schema, modules);

    await expect(
      t.query(api.me.queries.getMyListings, {
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).resolves.toMatchObject({ page: [], isDone: true });
    authState.userId = "member-a";
  });
});
