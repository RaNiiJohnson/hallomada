import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";

export type SortMode = "shuffle" | "recent" | "oldest" | "top" | "bookmarked";

export type PostsResults = NonNullable<
  FunctionReturnType<typeof api.posts.queries.getSortedPosts>
>;
export type Post = PostsResults["posts"][number];

export type Comment = {
  _id: Id<"postComments">;
  _creationTime: number;
  authorId?: string;
  authorName?: string;
  content: string;
  likes: { userId: string }[];
  likesCount: number;
  userHasLiked?: boolean;
  replies: ({
    _id: Id<"postCommentReplies">;
    _creationTime: number;
    authorId?: string;
    authorName?: string;
    content: string;
    likes: { userId: string }[];
    likesCount: number;
    userHasLiked?: boolean;
  } | null)[];
};

export const PAGE_SIZE = 10;
