import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { authAction, internalMutation, query } from "../functions";
import { languageValidator } from "../translations/shared";
import { enforceTranslationLimits } from "../translations/security";
import { translateWithOpenAI } from "../translations/translate.lib";

type PostFields = { title: string; content: string };

export const getSource = query({
  args: { id: v.id("posts") },
  handler: async (ctx, { id }) => {
    const post = await ctx.db.get(id);
    if (!post) return null;
    return {
      title: post.title,
      content: post.content,
      updatedAt: post.updatedAt ?? post._creationTime,
    };
  },
});

export const getTranslation = query({
  args: { postId: v.id("posts"), language: languageValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("postTranslations")
      .withIndex("by_post_language", (q) =>
        q.eq("postId", args.postId).eq("language", args.language),
      )
      .first();
  },
});

export const saveTranslation = internalMutation({
  args: {
    postId: v.id("posts"),
    language: languageValidator,
    title: v.string(),
    content: v.string(),
    sourceUpdatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("postTranslations")
      .withIndex("by_post_language", (q) =>
        q.eq("postId", args.postId).eq("language", args.language),
      )
      .first();

    if (existing) {
      if (args.sourceUpdatedAt < existing.sourceUpdatedAt) return existing._id;
      await ctx.db.patch(existing._id, {
        title: args.title,
        content: args.content,
        sourceUpdatedAt: args.sourceUpdatedAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("postTranslations", args);
  },
});

export const translatePost = authAction({
  args: { postId: v.id("posts"), targetLanguage: languageValidator },
  returns: v.object({ title: v.string(), content: v.string() }),
  handler: async (ctx, args): Promise<PostFields> => {
    // getSource vérifie l'accès (communauté privée) avec l'identité de l'appelant
    const post = await ctx.runQuery(api.posts.translate.getSource, {
      id: args.postId,
    });
    if (!post) throw new Error("Post not found");

    const cached = await ctx.runQuery(api.posts.translate.getTranslation, {
      postId: args.postId,
      language: args.targetLanguage,
    });
    if (cached && cached.sourceUpdatedAt === post.updatedAt) {
      return { title: cached.title, content: cached.content };
    }

    await enforceTranslationLimits(ctx, {
      userId: ctx.user._id,
      resourceKey: `post:${args.postId}:${args.targetLanguage}:${post.updatedAt}`,
    });

    const translated = await translateWithOpenAI(
      "post",
      { title: post.title, content: post.content },
      args.targetLanguage,
    );

    await ctx.runMutation(internal.posts.translate.saveTranslation, {
      postId: args.postId,
      language: args.targetLanguage,
      title: translated.title,
      content: translated.content,
      sourceUpdatedAt: post.updatedAt,
    });

    return translated;
  },
});
