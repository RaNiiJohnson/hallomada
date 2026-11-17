import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { authComponent } from "../auth/auth";
import { authAction, internalMutation, query } from "../functions";
import { languageValidator } from "../translations/shared";
import { enforceTranslationLimits } from "../translations/security";
import { translateWithOpenAI } from "../translations/translate.lib";
import { requiresPublicationModeration } from "@hallomada/shared/publication-lifecycle";

type JobFields = { title: string; description: string; city: string };

// ---------- Query : source (champs utiles seulement) ----------
export const getSource = query({
  args: { id: v.id("JobOffer") },
  handler: async (ctx, { id }) => {
    const job = await ctx.db.get(id);
    if (!job) return null;
    const user = await authComponent.safeGetAuthUser(ctx);
    if (
      (job.status === "archived" || requiresPublicationModeration(job.status)) &&
      user?._id !== job.authorId &&
      user?.role !== "admin"
    ) {
      return null;
    }
    return {
      title: job.title,
      description: job.description,
      city: job.city,
      updatedAt: job.updatedAt,
    };
  },
});

// ---------- Query : cache ----------
export const getTranslation = query({
  args: { jobId: v.id("JobOffer"), language: languageValidator },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const user = await authComponent.safeGetAuthUser(ctx);
    if (
      (job.status === "archived" || requiresPublicationModeration(job.status)) &&
      user?._id !== job.authorId &&
      user?.role !== "admin"
    ) {
      return null;
    }
    return await ctx.db
      .query("jobTranslations")
      .withIndex("by_job_language", (q) =>
        q.eq("jobId", args.jobId).eq("language", args.language),
      )
      .first();
  },
});

// ---------- Mutation interne : sauvegarde ----------
export const saveTranslation = internalMutation({
  args: {
    jobId: v.id("JobOffer"),
    language: languageValidator,
    title: v.string(),
    description: v.string(),
    city: v.string(),
    sourceUpdatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.updatedAt !== args.sourceUpdatedAt) return null;
    const existing = await ctx.db
      .query("jobTranslations")
      .withIndex("by_job_language", (q) =>
        q.eq("jobId", args.jobId).eq("language", args.language),
      )
      .first();

    if (existing) {
      // Une traduction plus récente existe déjà : on ne l'écrase pas
      if (args.sourceUpdatedAt < existing.sourceUpdatedAt) return existing._id;
      await ctx.db.patch(existing._id, {
        title: args.title,
        description: args.description,
        city: args.city,
        sourceUpdatedAt: args.sourceUpdatedAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("jobTranslations", args);
  },
});

// ---------- Action ----------
export const translateJob = authAction({
  args: { jobId: v.id("JobOffer"), targetLanguage: languageValidator },
  returns: v.object({
    title: v.string(),
    description: v.string(),
    city: v.string(),
  }),
  handler: async (ctx, args): Promise<JobFields> => {
    const job = await ctx.runQuery(api.jobs.translate.getSource, {
      id: args.jobId,
    });
    if (!job) throw new Error("Job not found");

    const cached = await ctx.runQuery(api.jobs.translate.getTranslation, {
      jobId: args.jobId,
      language: args.targetLanguage,
    });
    if (cached && cached.sourceUpdatedAt === job.updatedAt) {
      return {
        title: cached.title,
        description: cached.description,
        city: cached.city,
      };
    }

    await enforceTranslationLimits(ctx, {
      userId: ctx.user._id,
      resourceKey: `job:${args.jobId}:${args.targetLanguage}:${job.updatedAt}`,
    });

    const translated = await translateWithOpenAI(
      "job",
      { title: job.title, description: job.description, city: job.city },
      args.targetLanguage,
    );

    await ctx.runMutation(internal.jobs.translate.saveTranslation, {
      jobId: args.jobId,
      language: args.targetLanguage,
      title: translated.title,
      description: translated.description,
      city: translated.city,
      sourceUpdatedAt: job.updatedAt,
    });

    return translated;
  },
});
