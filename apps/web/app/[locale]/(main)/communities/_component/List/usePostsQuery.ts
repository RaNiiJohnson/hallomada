import { useRicherStableQuery } from "@/lib/useStableQuery";
import { api } from "@convex/_generated/api";
import { PAGE_SIZE, SortMode } from "./types";

export function usePostsQuery(mode: SortMode, offset: number, seed: string) {
  const shuffle = useRicherStableQuery(
    api.posts.queries.getShuffledPosts,
    mode === "shuffle" ? { seed, offset, numItems: PAGE_SIZE } : "skip",
  );
  const recent = useRicherStableQuery(
    api.posts.queries.getSortedPosts,
    mode === "recent"
      ? { order: "desc" as const, offset, numItems: PAGE_SIZE }
      : "skip",
  );
  const oldest = useRicherStableQuery(
    api.posts.queries.getSortedPosts,
    mode === "oldest"
      ? { order: "asc" as const, offset, numItems: PAGE_SIZE }
      : "skip",
  );
  const top = useRicherStableQuery(
    api.posts.queries.getSortedByLikes,
    mode === "top" ? { offset, numItems: PAGE_SIZE } : "skip",
  );
  const bookmarked = useRicherStableQuery(
    api.posts.queries.getBookmarkedPosts,
    mode === "bookmarked" ? { offset, numItems: PAGE_SIZE } : "skip",
  );

  const dataMap = { shuffle, recent, oldest, top, bookmarked };
  return dataMap[mode];
}
