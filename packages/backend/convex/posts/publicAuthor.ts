import type { PublicUser } from "../betterAuth/publicUser";

export function publicAuthorOrFallback(
  author: PublicUser | null,
  post: { authorId: string; authorName?: string },
): PublicUser {
  return (
    author ?? {
      _id: post.authorId,
      name: post.authorName ?? "Deleted user",
      slug: null,
      isPublic: false,
      showEmail: false,
    }
  );
}
