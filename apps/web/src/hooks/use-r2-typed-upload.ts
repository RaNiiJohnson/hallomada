import { useAction, useMutation } from "convex/react";
import type { FunctionReference } from "convex/server";

/**
 * Expected reference for a custom "generateXUploadUrl" mutation
 * (the ones we created in convex/integrations/r2.ts:
 * generateCvUploadUrl, generateListingUploadUrl, generatePdpUploadUrl,
 * generatePdcUploadUrl...).
 *
 * It should take { contentType?: string } and return { url, key }.
 */
type GenerateUploadUrlFn = FunctionReference<
  "mutation",
  "public",
  { contentType: string },
  { key: string; url: string }
>;

/**
 * Reference to the authenticated server-side metadata validation action.
 */
type SyncMetadataFn = FunctionReference<
  "action",
  "public",
  { key: string },
  unknown
>;

interface UseTypedR2UploadOptions {
  /**
   * Accepted MIME type, used only for a client-side check before
   * uploading (the real enforcement should stay on the server /
   * bucket policy).
   */
  accept?: string;
}

type GenerateUploadUrl = (args: {
  contentType: string;
}) => Promise<{ key: string; url: string }>;
type SyncMetadata = (args: { key: string }) => Promise<unknown>;

function acceptsMimeType(contentType: string, accept?: string) {
  if (!accept) return true;
  return accept.split(",").some((entry) => {
    const allowed = entry.trim();
    return allowed.endsWith("/*")
      ? contentType.startsWith(allowed.slice(0, -1))
      : contentType === allowed;
  });
}

export async function uploadTypedFile(
  file: File,
  generateUrl: GenerateUploadUrl,
  syncMetadata: SyncMetadata,
  options?: UseTypedR2UploadOptions,
  request: typeof fetch = fetch,
): Promise<string> {
  if (!acceptsMimeType(file.type, options?.accept)) {
    throw new Error(`File type not allowed: ${file.type}`);
  }

  const { url, key } = await generateUrl({ contentType: file.type });
  const response = await request(url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.status} ${response.statusText}`);
  }

  await syncMetadata({ key });
  return key;
}

/**
 * Generic hook to upload a file to R2 through a custom
 * "generateXUploadUrl" mutation (so the key is prefixed with a
 * logical folder: cv/, listing/, pdp/, pdc/...), instead of the
 * generic generateUploadUrl from clientApi() which puts everything
 * at the bucket root.
 *
 * Mirrors what useUploadFile from @convex-dev/r2/react does, but
 * with a key controlled on the server side.
 */
export function useTypedR2Upload(
  generateUploadUrl: GenerateUploadUrlFn,
  syncMetadata: SyncMetadataFn,
  options?: UseTypedR2UploadOptions,
) {
  const generateUrl = useMutation(generateUploadUrl);
  const sync = useAction(syncMetadata);

  async function upload(file: File): Promise<string> {
    return await uploadTypedFile(file, generateUrl, sync, options);
  }

  return { upload };
}
