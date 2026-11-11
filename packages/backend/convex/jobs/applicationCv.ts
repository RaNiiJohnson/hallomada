import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { httpAction, internalMutation, internalQuery } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { r2 } from "../integrations/r2";

/** How long a recruiter can open a candidate's CV from the e-mail link. */
export const APPLICATION_CV_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/** Lifetime of the signed R2 URL the link redirects to; minted on every click. */
const SIGNED_URL_SECONDS = 5 * 60;

const PURGE_BATCH = 50;

export function generateCvToken() {
  return (
    crypto.randomUUID().replaceAll("-", "") +
    crypto.randomUUID().replaceAll("-", "")
  );
}

/** Makes sure the application has a live token, creating one for legacy rows. */
export async function ensureCvToken(
  ctx: MutationCtx,
  application: Doc<"jobApplications">,
) {
  const now = Date.now();
  if (
    application.cvToken &&
    application.cvExpiresAt !== undefined &&
    application.cvExpiresAt > now &&
    application.cvPurgedAt === undefined
  ) {
    return application.cvToken;
  }
  if (application.cvPurgedAt !== undefined) return null;
  const cvToken = application.cvToken ?? generateCvToken();
  await ctx.db.patch(application._id, {
    cvToken,
    cvExpiresAt: now + APPLICATION_CV_RETENTION_MS,
  });
  return cvToken;
}

type CvTokenResolution =
  | { status: "ok"; cvKey: string }
  | { status: "expired" }
  | { status: "notFound" };

export const resolveCvToken = internalQuery({
  args: { token: v.string() },
  returns: v.union(
    v.object({ status: v.literal("ok"), cvKey: v.string() }),
    v.object({ status: v.literal("expired") }),
    v.object({ status: v.literal("notFound") }),
  ),
  handler: async (ctx, { token }) => {
    const application = await ctx.db
      .query("jobApplications")
      .withIndex("by_cvToken", (q) => q.eq("cvToken", token))
      .unique();
    if (!application) return { status: "notFound" as const };
    if (
      application.cvPurgedAt !== undefined ||
      application.cvExpiresAt === undefined ||
      application.cvExpiresAt <= Date.now()
    ) {
      return { status: "expired" as const };
    }
    return { status: "ok" as const, cvKey: application.cvKey };
  },
});

/**
 * Public link target: `GET /application-cv?t=<token>`. The token is the only
 * credential (recruiters have no account); it is unguessable and time-limited.
 */
export const downloadApplicationCv = httpAction(async (ctx, req) => {
  const token = new URL(req.url).searchParams.get("t");
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  if (!token || token.length < 32 || token.length > 128) {
    return new Response("Not found", { status: 404, headers });
  }
  const result: CvTokenResolution = await ctx.runQuery(
    internal.jobs.applicationCv.resolveCvToken,
    { token },
  );
  if (result.status === "notFound") {
    return new Response("Not found", { status: 404, headers });
  }
  if (result.status === "expired") {
    return new Response("This CV link has expired.", { status: 410, headers });
  }
  const url = await r2.getUrl(result.cvKey, { expiresIn: SIGNED_URL_SECONDS });
  return new Response(null, {
    status: 302,
    headers: { ...headers, Location: url },
  });
});

async function profileCvKey(
  ctx: MutationCtx,
  candidateId: string,
): Promise<string | null | undefined> {
  try {
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: candidateId }],
    });
    return (user?.cv as string | null | undefined) ?? null;
  } catch (error) {
    console.error("Unable to read the candidate's profile CV", error);
    return undefined;
  }
}

/**
 * Ends access to CVs whose retention window has passed. The stored file is
 * deleted unless another live application or the candidate's profile still
 * uses the same key.
 */
export const purgeExpiredApplicationCvs = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("jobApplications")
      .withIndex("by_cvExpiresAt", (q) =>
        // `gt 0` skips rows without an expiry (undefined sorts first).
        q.gt("cvExpiresAt", 0).lt("cvExpiresAt", Date.now()),
      )
      .take(PURGE_BATCH);

    for (const application of expired) {
      if (application.cvPurgedAt !== undefined) continue;
      await ctx.db.patch(application._id, {
        cvPurgedAt: Date.now(),
        // Leaves the index so the cleanup never rescans this row.
        cvExpiresAt: undefined,
      });

      const sharers = await ctx.db
        .query("jobApplications")
        .withIndex("by_cvKey", (q) => q.eq("cvKey", application.cvKey))
        .take(PURGE_BATCH);
      const stillUsed = sharers.some(
        (other) =>
          other._id !== application._id && other.cvPurgedAt === undefined,
      );
      if (stillUsed) continue;

      // One-off application CVs belong to the application alone. Profile CVs
      // are only removed once the candidate no longer has them as current CV.
      if (!application.cvKey.startsWith("applicationCv/")) {
        const current = await profileCvKey(ctx, application.candidateId);
        if (current === undefined || current === application.cvKey) continue;
      }
      try {
        await r2.deleteObject(ctx, application.cvKey);
      } catch (error) {
        console.error("Unable to delete expired application CV", error);
      }
    }

    if (expired.length === PURGE_BATCH) {
      await ctx.scheduler.runAfter(
        0,
        internal.jobs.applicationCv.purgeExpiredApplicationCvs,
        {},
      );
    }
    return null;
  },
});
