import { R2 } from "@convex-dev/r2";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import { authComponent } from "../auth/auth";
import {
  authAction,
  authMutation,
  internalMutation,
  internalQuery,
  query,
} from "../functions";
import { limiter } from "../rateLimits";
import schema from "../schema";
import {
  throwForbidden,
  throwLimitReached,
  throwNotFound,
  throwValidationError,
} from "../utils/errors";

export const r2 = new R2(components.r2);
type R2ActionCtx = Parameters<typeof r2.syncMetadata>[0];
type R2QueryCtx = Parameters<typeof r2.getMetadata>[0];

const uploadKindValidator = v.union(
  v.literal("cv"),
  v.literal("listing"),
  v.literal("profile"),
  v.literal("cover"),
  v.literal("applicationCv"),
);

type UploadKind = "cv" | "listing" | "profile" | "cover" | "applicationCv";

const PDF_CONTENT_TYPE = "application/pdf" as const;
const imageContentTypeValidator = v.union(
  v.literal("image/jpeg"),
  v.literal("image/png"),
  v.literal("image/webp"),
  v.literal("image/avif"),
);
type ImageContentType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/avif";

const MAX_CV_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function buildKey(folder: UploadKind, contentType: string) {
  const extensionByContentType: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };
  const extension = extensionByContentType[contentType];
  if (!extension) throwValidationError("Unsupported upload content type");
  return `${folder}/${crypto.randomUUID()}.${extension}`;
}

async function issueUploadUrl(
  ctx: MutationCtx,
  args: {
    userId: string;
    kind: UploadKind;
    contentType: string;
    maxSize: number;
  },
) {
  const rate = await limiter.limit(ctx, "uploadUrlPerUser", {
    key: args.userId,
  });
  if (!rate.ok) {
    throwLimitReached("Too many upload requests", {
      retryAfter: rate.retryAfter ?? 0,
    });
  }

  const key = buildKey(args.kind, args.contentType);
  await ctx.db.insert("uploadGrants", {
    key,
    userId: args.userId,
    kind: args.kind,
    expectedContentType: args.contentType,
    maxSize: args.maxSize,
    verified: false,
  });

  return await r2.generateUploadUrl(key);
}

const uploadUrlResultValidator = v.object({ key: v.string(), url: v.string() });

export const generateCvUploadUrl = authMutation({
  args: { contentType: v.literal(PDF_CONTENT_TYPE) },
  returns: uploadUrlResultValidator,
  handler: async (ctx, { contentType }) => {
    return await issueUploadUrl(ctx, {
      userId: ctx.user._id,
      kind: "cv",
      contentType,
      maxSize: MAX_CV_SIZE,
    });
  },
});

export const generateApplicationCvUploadUrl = authMutation({
  args: { contentType: v.literal(PDF_CONTENT_TYPE) },
  returns: uploadUrlResultValidator,
  handler: async (ctx, { contentType }) => {
    return await issueUploadUrl(ctx, {
      userId: ctx.user._id,
      kind: "applicationCv",
      contentType,
      maxSize: MAX_CV_SIZE,
    });
  },
});

export const generateListingUploadUrl = authMutation({
  args: { contentType: imageContentTypeValidator },
  returns: uploadUrlResultValidator,
  handler: async (ctx, { contentType }) => {
    return await issueUploadUrl(ctx, {
      userId: ctx.user._id,
      kind: "listing",
      contentType,
      maxSize: MAX_IMAGE_SIZE,
    });
  },
});

export const generatePdpUploadUrl = authMutation({
  args: { contentType: imageContentTypeValidator },
  returns: uploadUrlResultValidator,
  handler: async (ctx, { contentType }) => {
    return await issueUploadUrl(ctx, {
      userId: ctx.user._id,
      kind: "profile",
      contentType,
      maxSize: MAX_IMAGE_SIZE,
    });
  },
});

export const generatePdcUploadUrl = authMutation({
  args: { contentType: imageContentTypeValidator },
  returns: uploadUrlResultValidator,
  handler: async (ctx, { contentType }) => {
    return await issueUploadUrl(ctx, {
      userId: ctx.user._id,
      kind: "cover",
      contentType,
      maxSize: MAX_IMAGE_SIZE,
    });
  },
});

export const getUploadGrant = internalQuery({
  args: { key: v.string() },
  returns: v.union(schema.doc("uploadGrants"), v.null()),
  handler: async (ctx, { key }) => {
    return await ctx.db
      .query("uploadGrants")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
  },
});

export const verifyUploadGrant = internalMutation({
  args: { key: v.string() },
  returns: v.null(),
  handler: async (ctx, { key }) => {
    const grant = await ctx.db
      .query("uploadGrants")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!grant) throwNotFound("Upload grant not found");
    await ctx.db.patch(grant._id, { verified: true });
    return null;
  },
});

export const syncMetadata = authAction({
  args: { key: v.string() },
  returns: v.null(),
  handler: async (ctx, { key }) => {
    const grant = await ctx.runQuery(internal.integrations.r2.getUploadGrant, {
      key,
    });
    if (!grant || grant.userId !== ctx.user._id) {
      throwForbidden("Upload key does not belong to the current user");
    }

    // @convex-dev/r2 currently declares the pre-transaction-limits ActionCtx
    // shape; the runtime context is compatible, but the package types lag Convex.
    await r2.syncMetadata(ctx as unknown as R2ActionCtx, key);
    const metadata = await r2.getMetadata(ctx as unknown as R2QueryCtx, key);
    const valid =
      metadata?.contentType === grant.expectedContentType &&
      typeof metadata.size === "number" &&
      metadata.size <= grant.maxSize;

    if (!valid) {
      await ctx.runMutation(internal.integrations.r2.deleteR2Object, { key });
      throwValidationError("Uploaded file type or size is not allowed");
    }

    await ctx.runMutation(internal.integrations.r2.verifyUploadGrant, { key });
    return null;
  },
});

export async function assertVerifiedUpload(
  ctx: MutationCtx,
  args: { key: string; userId: string; kind: UploadKind },
) {
  const grant = await ctx.db
    .query("uploadGrants")
    .withIndex("by_key", (q) => q.eq("key", args.key))
    .unique();
  if (
    !grant ||
    grant.userId !== args.userId ||
    grant.kind !== args.kind ||
    !grant.verified
  ) {
    throwForbidden("Upload key is not verified for the current user");
  }
  return grant;
}

export async function consumeUploadGrant(ctx: MutationCtx, key: string) {
  const grant = await ctx.db
    .query("uploadGrants")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (grant) await ctx.db.delete(grant._id);
}

export const deleteR2Object = internalMutation({
  args: { key: v.string() },
  returns: v.null(),
  handler: async (ctx, { key }) => {
    await r2.deleteObject(ctx, key);
    await consumeUploadGrant(ctx, key);
    return null;
  },
});

/** True while a not-yet-purged application still points at this stored CV. */
async function isCvUsedByApplication(ctx: MutationCtx, cvKey: string) {
  const applications = await ctx.db
    .query("jobApplications")
    .withIndex("by_cvKey", (q) => q.eq("cvKey", cvKey))
    .take(50);
  return applications.some((application) => application.cvPurgedAt === undefined);
}

export const uploadCvAndDeleteOld = authMutation({
  args: { newCvKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { newCvKey }) => {
    const user = ctx.user;
    await assertVerifiedUpload(ctx, {
      key: newCvKey,
      userId: user._id,
      kind: "cv",
    });

    const previousCv = user.cv;

    await ctx.runMutation(components.betterAuth.users.updateUser, {
      id: user._id,
      patch: { cv: newCvKey },
    });
    await consumeUploadGrant(ctx, newCvKey);

    if (previousCv && previousCv !== newCvKey) {
      if (!(await isCvUsedByApplication(ctx, previousCv))) {
        await r2.deleteObject(ctx, previousCv);
      }
    }
    return null;
  },
});

export const replaceProfileImage = authMutation({
  args: {
    key: v.string(),
    imageType: v.union(v.literal("profile"), v.literal("cover")),
  },
  returns: v.null(),
  handler: async (ctx, { key, imageType }) => {
    const kind: UploadKind = imageType;
    await assertVerifiedUpload(ctx, {
      key,
      userId: ctx.user._id,
      kind,
    });

    const field = imageType === "profile" ? "image" : "coverImage";
    const previousKey = ctx.user[field];

    await ctx.runMutation(components.betterAuth.users.updateUser, {
      id: ctx.user._id,
      patch: { [field]: key },
    });
    await consumeUploadGrant(ctx, key);

    const expectedPrefix = `${kind}/`;
    if (
      previousKey &&
      previousKey !== key &&
      previousKey.startsWith(expectedPrefix)
    ) {
      try {
        await r2.deleteObject(ctx, previousKey);
      } catch (error) {
        console.error(`Unable to delete replaced ${imageType} image`, error);
      }
    }
    return null;
  },
});

export const deleteCv = authMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = ctx.user;
    if (!user.cv) throwNotFound("No CV to delete");

    if (!(await isCvUsedByApplication(ctx, user.cv))) {
      await r2.deleteObject(ctx, user.cv);
    }
    await ctx.runMutation(components.betterAuth.users.updateUser, {
      id: user._id,
      patch: { cv: null },
    });
    return null;
  },
});

export const getCvUrl = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.cv) return null;
    return await r2.getUrl(user.cv);
  },
});

export { imageContentTypeValidator, uploadKindValidator };
export type { ImageContentType };
