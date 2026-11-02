import { v } from "convex/values";
import Rand from "rand-seed";
import { components } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { DatabaseReader, query, type QueryCtx } from "../_generated/server";
import {
  postCommentsCount,
  postLikesCount,
  postShuffle,
  postSortedByDate,
  postSortedByLikes,
} from "../aggregates";
import { authComponent } from "../auth/auth";
import { r2 } from "../integrations/r2";
import { publicAuthorOrFallback } from "./publicAuthor";

type AuthUser = Awaited<ReturnType<typeof authComponent.safeGetAuthUser>>;

// ─── Helpers réutilisables

/** Public author card for a post. Uploaded avatars are stored as R2 keys
 * ("profile/…"), so they are signed into a URL here like on the profile page. */
async function getPostAuthor(
  ctx: QueryCtx,
  post: { authorId: string; authorName?: string },
) {
  const author = publicAuthorOrFallback(
    await ctx.runQuery(components.betterAuth.users.getUserById, {
      id: post.authorId,
    }),
    post,
  );
  return author.image?.startsWith("profile/")
    ? { ...author, image: await r2.getUrl(author.image) }
    : author;
}

async function getReplyWithLikes(
  db: DatabaseReader,
  replyId: Id<"postCommentReplies">,
  user: AuthUser,
) {
  const reply = await db.get(replyId);
  if (!reply) return null;
  const likes = await db
    .query("postCommentReplyLikes")
    .withIndex("by_replyId", (q) => q.eq("replyId", replyId))
    .take(100);

  let userHasLiked = false;
  if (user) {
    const existingLike = await db
      .query("postCommentReplyLikes")
      .withIndex("by_replyId_and_userId", (q) =>
        q.eq("replyId", replyId).eq("userId", user._id),
      )
      .unique();
    if (existingLike) userHasLiked = true;
  }

  return { ...reply, likes, likesCount: likes.length, userHasLiked };
}

// Fisher-Yates
function shuffle<T>(array: T[], rand: Rand): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rand.next() * (i + 1));
    [array[i], array[j]] = [array[j]!, array[i]!];
  }
  return array;
}

async function getCommentWithMeta(
  db: DatabaseReader,
  commentId: Id<"postComments">,
  user: AuthUser,
) {
  const comment = await db.get(commentId);
  if (!comment) return null;

  const [commentLikes, replies] = await Promise.all([
    db
      .query("postCommentLikes")
      .withIndex("by_commentId", (q) => q.eq("commentId", commentId))
      .take(100),
    db
      .query("postCommentReplies")
      .withIndex("by_commentId", (q) => q.eq("commentId", commentId))
      .take(100),
  ]);

  const repliesWithLikes = await Promise.all(
    replies.map((r) => getReplyWithLikes(db, r._id, user)),
  );

  let userHasLiked = false;
  if (user) {
    const existingLike = await db
      .query("postCommentLikes")
      .withIndex("by_commentId_and_userId", (q) =>
        q.eq("commentId", commentId).eq("userId", user._id),
      )
      .unique();
    if (existingLike) userHasLiked = true;
  }

  return {
    ...comment,
    likes: commentLikes,
    likesCount: commentLikes.length,
    userHasLiked,
    replies: repliesWithLikes,
  };
}

// ─── Queries

export const getPostWithMeta = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!post) return null;

    const [likesCount, commentsCount, comments] = await Promise.all([
      postLikesCount.count(ctx, { namespace: post._id }),
      postCommentsCount.count(ctx, { namespace: post._id }),
      ctx.db
        .query("postComments")
        .withIndex("by_postId", (q) => q.eq("postId", post._id))
        .take(100),
    ]);

    const commentsWithMeta = await Promise.all(
      comments.map((c) => getCommentWithMeta(ctx.db, c._id, user)),
    );

    let userHasLiked = false;
    let isBookmarked = false;
    if (user) {
      const existingLike = await ctx.db
        .query("postLikes")
        .withIndex("by_postId_and_userId", (q) =>
          q.eq("postId", post._id).eq("userId", user._id),
        )
        .unique();
      if (existingLike) userHasLiked = true;

      const existingBookmark = await ctx.db
        .query("bookmarks")
        .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
          q
            .eq("userId", user._id)
            .eq("resourceType", "post")
            .eq("resourceId", post._id),
        )
        .unique();
      if (existingBookmark) isBookmarked = true;
    }

    return {
      ...post,
      likesCount,
      userHasLiked,
      isBookmarked,
      comments: commentsWithMeta,
      commentsCount,
    };
  },
});

export const getShuffledPosts = query({
  args: {
    seed: v.string(), // fixe pour toute la session → même ordre
    offset: v.number(), // 0, 10, 20, ...
    numItems: v.number(), // 10 par page
  },
  handler: async (ctx, { seed, offset, numItems }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const count = await postShuffle.count(ctx);

    if (count === 0)
      return { posts: [], hasMore: false, hasPrevPage: false, totalCount: 0 };

    // Génère l'ordre shufflé une fois avec le seed
    const rand = new Rand(seed);
    const allIndexes = Array.from({ length: count }, (_, i) => i);
    shuffle(allIndexes, rand);

    const pageIndexes = allIndexes.slice(offset, offset + numItems);

    const atIndexes = await Promise.all(
      pageIndexes.map((i) => postShuffle.at(ctx, i)),
    );

    const posts = await Promise.all(
      atIndexes.map(async ({ id }) => {
        const post = await ctx.db.get(id);
        if (!post) return null;

        const [likesCount, commentsCount] = await Promise.all([
          postLikesCount.count(ctx, { namespace: post._id }),
          postCommentsCount.count(ctx, { namespace: post._id }),
        ]);

        let userHasLiked = false;
        let isBookmarked = false;
        if (user) {
          const existingLike = await ctx.db
            .query("postLikes")
            .withIndex("by_postId_and_userId", (q) =>
              q.eq("postId", post._id).eq("userId", user._id),
            )
            .unique();
          if (existingLike) userHasLiked = true;

          const existingBookmark = await ctx.db
            .query("bookmarks")
            .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
              q
                .eq("userId", user._id)
                .eq("resourceType", "post")
                .eq("resourceId", post._id),
            )
            .unique();
          if (existingBookmark) isBookmarked = true;
        }

        const author = await getPostAuthor(ctx, post);

        return {
          ...post,
          likesCount,
          commentsCount,
          userHasLiked,
          isBookmarked,
          author,
        };
      }),
    );

    return {
      posts: posts.filter(
        (post): post is NonNullable<typeof post> => post !== null,
      ),
      hasMore: offset + numItems < count,
      hasPrevPage: offset > 0,
      totalCount: count,
    };
  },
});

export const getSortedPosts = query({
  args: {
    order: v.union(v.literal("asc"), v.literal("desc")),
    offset: v.number(),
    numItems: v.number(),
  },
  handler: async (ctx, { order, offset, numItems }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const count = await postSortedByDate.count(ctx);

    if (count === 0)
      return { posts: [], hasMore: false, hasPrevPage: false, totalCount: 0 };

    const pageIndexes = Array.from({ length: numItems }, (_, i) => {
      const idx = offset + i;
      if (idx >= count) return null;
      return order === "desc" ? count - 1 - idx : idx;
    }).filter((i): i is number => i !== null);

    const atIndexes = await Promise.all(
      pageIndexes.map((i) => postSortedByDate.at(ctx, i)),
    );

    const posts = await Promise.all(
      atIndexes.map(async (atIdx) => {
        if (!atIdx) return null;
        const post = await ctx.db.get(atIdx.id);
        if (!post) return null;

        const [likesCount, commentsCount] = await Promise.all([
          postLikesCount.count(ctx, { namespace: post._id }),
          postCommentsCount.count(ctx, { namespace: post._id }),
        ]);

        let userHasLiked = false;
        let isBookmarked = false;
        if (user) {
          const existingLike = await ctx.db
            .query("postLikes")
            .withIndex("by_postId_and_userId", (q) =>
              q.eq("postId", post._id).eq("userId", user._id),
            )
            .unique();
          if (existingLike) userHasLiked = true;

          const existingBookmark = await ctx.db
            .query("bookmarks")
            .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
              q
                .eq("userId", user._id)
                .eq("resourceType", "post")
                .eq("resourceId", post._id),
            )
            .unique();
          if (existingBookmark) isBookmarked = true;
        }

        const author = await getPostAuthor(ctx, post);

        return {
          ...post,
          likesCount,
          commentsCount,
          userHasLiked,
          isBookmarked,
          author,
        };
      }),
    );

    return {
      posts: posts.filter(
        (post): post is NonNullable<typeof post> => post !== null,
      ),
      hasMore: offset + numItems < count,
      hasPrevPage: offset > 0,
      totalCount: count,
    };
  },
});

export const getSortedByLikes = query({
  args: {
    offset: v.number(),
    numItems: v.number(),
  },
  handler: async (ctx, { offset, numItems }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const count = await postSortedByLikes.count(ctx);

    if (count === 0)
      return { posts: [], hasMore: false, hasPrevPage: false, totalCount: 0 };

    // Descending order: most likes first
    const pageIndexes = Array.from({ length: numItems }, (_, i) => {
      const idx = offset + i;
      if (idx >= count) return null;
      return count - 1 - idx;
    }).filter((i): i is number => i !== null);

    const atIndexes = await Promise.all(
      pageIndexes.map((i) => postSortedByLikes.at(ctx, i)),
    );

    const posts = await Promise.all(
      atIndexes.map(async (atIdx) => {
        if (!atIdx) return null;
        const post = await ctx.db.get(atIdx.id);
        if (!post) return null;

        const [likesCount, commentsCount] = await Promise.all([
          postLikesCount.count(ctx, { namespace: post._id }),
          postCommentsCount.count(ctx, { namespace: post._id }),
        ]);

        let userHasLiked = false;
        let isBookmarked = false;
        if (user) {
          const existingLike = await ctx.db
            .query("postLikes")
            .withIndex("by_postId_and_userId", (q) =>
              q.eq("postId", post._id).eq("userId", user._id),
            )
            .unique();
          if (existingLike) userHasLiked = true;

          const existingBookmark = await ctx.db
            .query("bookmarks")
            .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
              q
                .eq("userId", user._id)
                .eq("resourceType", "post")
                .eq("resourceId", post._id),
            )
            .unique();
          if (existingBookmark) isBookmarked = true;
        }

        const author = await getPostAuthor(ctx, post);

        return {
          ...post,
          likesCount,
          commentsCount,
          userHasLiked,
          isBookmarked,
          author,
        };
      }),
    );

    return {
      posts: posts.filter(
        (post): post is NonNullable<typeof post> => post !== null,
      ),
      hasMore: offset + numItems < count,
      hasPrevPage: offset > 0,
      totalCount: count,
    };
  },
});

export const getBookmarkedPosts = query({
  args: {
    offset: v.number(),
    numItems: v.number(),
  },
  handler: async (ctx, { offset, numItems }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user)
      return { posts: [], hasMore: false, hasPrevPage: false, totalCount: 0 };

    const safeOffset = Math.max(0, Math.min(offset, 1000));
    const safeNumItems = Math.max(1, Math.min(numItems, 50));
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
        q.eq("userId", user._id).eq("resourceType", "post"),
      )
      .order("desc")
      .take(safeOffset + safeNumItems + 1);

    if (bookmarks.length === 0)
      return { posts: [], hasMore: false, hasPrevPage: false, totalCount: 0 };

    const hasMore = bookmarks.length > safeOffset + safeNumItems;
    const pageBookmarks = bookmarks.slice(
      safeOffset,
      safeOffset + safeNumItems,
    );

    const posts = await Promise.all(
      pageBookmarks.map(async (b) => {
        const postId = ctx.db.normalizeId("posts", b.resourceId);
        if (!postId) return null;
        const post = await ctx.db.get(postId);
        if (!post) return null;

        const [likesCount, commentsCount] = await Promise.all([
          postLikesCount.count(ctx, { namespace: post._id }),
          postCommentsCount.count(ctx, { namespace: post._id }),
        ]);

        let userHasLiked = false;
        const existingLike = await ctx.db
          .query("postLikes")
          .withIndex("by_postId_and_userId", (q) =>
            q.eq("postId", post._id).eq("userId", user._id),
          )
          .unique();
        if (existingLike) userHasLiked = true;

        const author = await getPostAuthor(ctx, post);

        return {
          ...post,
          likesCount,
          commentsCount,
          userHasLiked,
          isBookmarked: true,
          author,
        };
      }),
    );

    return {
      posts: posts.filter(
        (post): post is NonNullable<typeof post> => post !== null,
      ),
      hasMore,
      hasPrevPage: safeOffset > 0,
      totalCount: hasMore
        ? safeOffset + safeNumItems + 1
        : safeOffset + pageBookmarks.length,
    };
  },
});
