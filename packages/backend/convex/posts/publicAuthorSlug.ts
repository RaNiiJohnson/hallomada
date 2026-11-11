import { components } from "../_generated/api";
import type { QueryCtx } from "../_generated/server";

/**
 * Profile slug of a content author, or `null` when the author's profile is
 * private or the account no longer exists. Only a link target is exposed, so
 * private authors stay unreachable from jobs, listings and posts.
 */
export async function getPublicAuthorSlug(
  ctx: QueryCtx,
  authorId: string,
): Promise<string | null> {
  const author = await ctx.runQuery(components.betterAuth.users.getUserById, {
    id: authorId,
  });
  return author?.slug ?? null;
}
