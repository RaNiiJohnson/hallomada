/**
 * Uploads a local file (e.g. from expo-document-picker) to R2 through one of
 * the backend's typed `generateXUploadUrl` mutations, then lets the backend
 * validate its metadata. Mirrors uploadTypedFile in apps/web.
 */
export async function uploadLocalFile<ContentType extends string>(
  file: { uri: string; mimeType: ContentType },
  generateUrl: (args: { contentType: ContentType }) => Promise<{ key: string; url: string }>,
  syncMetadata: (args: { key: string }) => Promise<unknown>,
): Promise<string> {
  const { url, key } = await generateUrl({ contentType: file.mimeType });
  const body = await (await fetch(file.uri)).blob();
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.mimeType },
    body,
  });
  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.status}`);
  }
  await syncMetadata({ key });
  return key;
}
