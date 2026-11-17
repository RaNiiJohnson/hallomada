import type { Id } from "@convex/_generated/dataModel";
import { LegacyBookmarkRedirect } from "./legacy-bookmark-redirect";

export default async function SavedBookmarkPage({
  params,
}: {
  params: Promise<{ bookmarkId: string }>;
}) {
  const { bookmarkId } = await params;
  return <LegacyBookmarkRedirect bookmarkId={bookmarkId as Id<"bookmarks">} />;
}
