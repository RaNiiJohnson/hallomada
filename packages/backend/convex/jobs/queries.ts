import { FilterBuilder, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { DataModel, Id } from "../_generated/dataModel";
import {
  isPublicPublicationStatus,
  requiresPublicationModeration,
  type PublicationStatus,
} from "@hallomada/shared/publication-lifecycle";
import { env } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { query } from "../functions";
import { getPublicAuthorSlug } from "../posts/publicAuthorSlug";

function isVisibleJob(
  job: { status?: PublicationStatus; authorId: string },
  userId?: string,
) {
  return (
    isPublicPublicationStatus(job.status) ||
    (job.status === "pending" && job.authorId === userId)
  );
}

function canManageJob(
  job: { authorId: string },
  user: { _id: string; role?: string | null } | null | undefined,
) {
  return user?._id === job.authorId || user?.role === "admin";
}

function isJobHiddenFromPublic(status: PublicationStatus | undefined) {
  return status === "archived" || requiresPublicationModeration(status);
}

function visibleJobFilter(
  q: FilterBuilder<DataModel["JobOffer"]>,
  userId?: string,
) {
  const publiclyVisible = q.or(
    q.eq(q.field("status"), "active"),
    q.eq(q.field("status"), undefined),
  );
  if (!userId) return publiclyVisible;

  return q.or(
    publiclyVisible,
    q.and(
      q.eq(q.field("status"), "pending"),
      q.eq(q.field("authorId"), userId),
    ),
  );
}

function withoutJobLocation<T extends { location?: unknown }>(job: T) {
  const { location, ...publicJob } = job;
  void location;
  return publicJob;
}

function approximateLocation(location: { lat: number; lng: number } | undefined) {
  if (!location) return undefined;
  return {
    lat: Math.round(location.lat * 100) / 100,
    lng: Math.round(location.lng * 100) / 100,
  };
}

export const getJobWithContact = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const job = await ctx.db
      .query("JobOffer")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (!job) return null;

    const user = await authComponent.safeGetAuthUser(ctx);
    if (
      isJobHiddenFromPublic(job.status) &&
      !canManageJob(job, user)
    ) {
      return null;
    }

    let isBookmarked = false;
    if (user) {
      const existingBookmark = await ctx.db
        .query("bookmarks")
        .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
          q
            .eq("userId", user._id)
            .eq("resourceType", "job")
            .eq("resourceId", job._id),
        )
        .unique();
      if (existingBookmark) isBookmarked = true;
    }

    return {
      ...withoutJobLocation(job),
      // A detail view can render a map, but it must never receive the
      // author-selected precision stored in the database.
      ...(job.workMode !== "remote" && job.location
        ? { location: approximateLocation(job.location) }
        : {}),
      isBookmarked,
      authorSlug: await getPublicAuthorSlug(ctx, job.authorId),
    };
  },
});

export const getJobLocationForEdit = query({
  args: { id: v.id("JobOffer") },
  returns: v.union(
    v.object({
      location: v.union(
        v.object({ lat: v.number(), lng: v.number() }),
        v.null(),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, { id }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const job = await ctx.db.get(id);
    if (!job || job.authorId !== user._id) {
      return null;
    }

    return { location: job.location ?? null };
  },
});

export const getJobContactForEdit = query({
  args: { id: v.id("JobOffer") },
  handler: async (ctx, { id }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const job = await ctx.db.get(id);
    if (!job || (job.authorId !== user._id && user.role !== "admin")) {
      return null;
    }

    const contact = await ctx.db
      .query("JobContactInfo")
      .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
      .unique();
    return { email: contact?.email ?? "" };
  },
});

export const hasCurrentUserAppliedToJob = query({
  args: { jobId: v.id("JobOffer") },
  returns: v.union(
    v.literal("none"),
    v.literal("pending"),
    v.literal("sent"),
    v.literal("failed"),
  ),
  handler: async (ctx, { jobId }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return "none";

    const application = await ctx.db
      .query("jobApplications")
      .withIndex("by_jobId_and_candidateId", (q) =>
        q.eq("jobId", jobId).eq("candidateId", user._id),
      )
      .unique();
    return application?.emailStatus ?? "none";
  },
});

export const getJobMetadata = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const job = await ctx.db
      .query("JobOffer")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!job) return null;

    const user = await authComponent.safeGetAuthUser(ctx);
    if (
      isJobHiddenFromPublic(job.status) &&
      !canManageJob(job, user)
    ) {
      return null;
    }

    return withoutJobLocation(job);
  },
});

export const getJobs = query({
  args: {
    paginationOpts: paginationOptsValidator,
    searchTerm: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("auPair"),
        v.literal("training"),
        v.literal("voluntary"),
        v.literal("internship"),
        v.literal("miniJob"),
        v.literal("job"),
        v.literal("freelance"),
        v.literal("scholarship"),
      ),
    ),
    contractType: v.optional(
      v.union(
        v.literal("CDI"),
        v.literal("CDD"),
        v.literal("FSJ/FOJ/BFD"),
        v.literal("fullTime"),
        v.literal("partTime"),
        v.literal("freelance"),
        v.literal("apprenticeship"),
      ),
    ),
    workMode: v.optional(
      v.union(v.literal("onSite"), v.literal("hybrid"), v.literal("remote")),
    ),
    bookmarkedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { searchTerm, type, contractType, workMode, bookmarkedOnly } = args;
    const user = await authComponent.safeGetAuthUser(ctx);
    const listFilter = (q: Parameters<typeof visibleJobFilter>[0]) => {
      const visible = visibleJobFilter(q, user?._id);
      return workMode ? q.and(visible, q.eq(q.field("workMode"), workMode)) : visible;
    };

    if (bookmarkedOnly) {
      if (!user) {
        return { page: [], isDone: true, continueCursor: "" };
      }
      const bookmarksPage = await ctx.db
        .query("bookmarks")
        .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
          q.eq("userId", user._id).eq("resourceType", "job"),
        )
        .order("desc")
        .paginate(args.paginationOpts);

      const enrichedPage = await Promise.all(
        bookmarksPage.page.map(async (b) => {
          const job = await ctx.db.get(b.resourceId as Id<"JobOffer">);
          if (!job) return null;
          return { ...withoutJobLocation(job), isBookmarked: true } as Omit<typeof job, "location"> & {
            isBookmarked: boolean;
          };
        }),
      );

      const filteredPage = enrichedPage.filter(
        (j): j is NonNullable<typeof j> =>
          j !== null && isVisibleJob(j, user._id),
      );
      return { ...bookmarksPage, page: filteredPage };
    }

    // CAS 1 : Recherche textuelle active
    if (searchTerm) {
      const searchResult = ctx.db
        .query("JobOffer")
        .withSearchIndex("search_all_fields", (q) => {
          let search = q.search("searchAll", searchTerm);
          if (type) search = search.eq("type", type);
          if (contractType) search = search.eq("contractType", contractType);
          return search;
        });

      // avant: return await searchResult.collect();
      const results = await searchResult
        .filter(listFilter)
        .paginate(args.paginationOpts);

      const enrichedPage = await Promise.all(
        results.page.map(async (job) => {
          let isBookmarked = false;
          if (user) {
            const existingBookmark = await ctx.db
              .query("bookmarks")
              .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
                q
                  .eq("userId", user._id)
                  .eq("resourceType", "job")
                  .eq("resourceId", job._id),
              )
              .unique();
            if (existingBookmark) isBookmarked = true;
          }
          return { ...withoutJobLocation(job), isBookmarked };
        }),
      );

      return {
        ...results,
        page: enrichedPage,
      };
    }

    // CAS 2 : Pas de recherche textuelle -> Utilisation des index de filtrage
    let results;

    // On utilise les index définis dans schéma
    if (type) {
      results = await ctx.db
        .query("JobOffer")
        .withIndex("by_type_and_listedAt", (q) => q.eq("type", type))
        .order("desc")
        .filter(listFilter)
        .paginate(args.paginationOpts);
    } else if (contractType) {
      results = await ctx.db
        .query("JobOffer")
        .withIndex("by_contract_and_listedAt", (q) =>
          q.eq("contractType", contractType),
        )
        .order("desc")
        .filter(listFilter)
        .paginate(args.paginationOpts);
    } else {
      results = await ctx.db
        .query("JobOffer")
        .withIndex("by_listedAt")
        .order("desc")
        .filter(listFilter)
        .paginate(args.paginationOpts);
    }

    // Filtre manuel si les deux (type ET contract) sont présents sans searchTerm
    // (car Convex ne supporte qu'un seul index à la fois)
    let pageFiltered = results.page;
    if (type && contractType) {
      pageFiltered = pageFiltered.filter(
        (job) => job.contractType === contractType,
      );
    }

    const enrichedPage = await Promise.all(
      pageFiltered.map(async (job) => {
        let isBookmarked = false;
        if (user) {
          const existingBookmark = await ctx.db
            .query("bookmarks")
            .withIndex("by_userId_and_resourceType_and_resourceId", (q) =>
              q
                .eq("userId", user._id)
                .eq("resourceType", "job")
                .eq("resourceId", job._id),
            )
            .unique();
          if (existingBookmark) isBookmarked = true;
        }
        return { ...withoutJobLocation(job), isBookmarked };
      }),
    );

    return { ...results, page: enrichedPage };
  },
});

export const getTranslation = query({
  args: {
    jobId: v.id("JobOffer"),
    language: v.union(v.literal("fr"), v.literal("en"), v.literal("de")),
  },

  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;

    const user = await authComponent.safeGetAuthUser(ctx);
    if (
      isJobHiddenFromPublic(job.status) &&
      !canManageJob(job, user)
    ) {
      return null;
    }

    return await ctx.db
      .query("jobTranslations")
      .withIndex("by_job_language", (q) =>
        q.eq("jobId", args.jobId).eq("language", args.language),
      )
      .unique();
  },
});

const MAX_RECEIVED_APPLICATIONS = 200;

/**
 * Applications received for one of the viewer's own job offers. Highlighted
 * (Premium) applications come first, then the most recent ones.
 */
export const listReceivedApplications = query({
  args: { jobId: v.id("JobOffer") },
  returns: v.union(
    v.null(),
    v.array(
      v.object({
        _id: v.id("jobApplications"),
        appliedAt: v.number(),
        highlighted: v.boolean(),
        candidateName: v.union(v.string(), v.null()),
        candidateId: v.string(),
        candidateSlug: v.union(v.string(), v.null()),
        coverLetter: v.union(v.string(), v.null()),
        cvUrl: v.union(v.string(), v.null()),
      }),
    ),
  ),
  handler: async (ctx, { jobId }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    const job = await ctx.db.get(jobId);
    if (!job || job.authorId !== user._id) return null;

    const applications = await ctx.db
      .query("jobApplications")
      .withIndex("by_jobId_and_candidateId", (q) => q.eq("jobId", jobId))
      .take(MAX_RECEIVED_APPLICATIONS);

    const rows = await Promise.all(
      applications.map(async (application) => {
        // Expired CVs are purged by a scheduled job; the link route also
        // refuses expired tokens.
        const cvAvailable =
          application.cvToken !== undefined &&
          application.cvPurgedAt === undefined;
        return {
          _id: application._id,
          appliedAt: application.appliedAt,
          highlighted: application.highlighted === true,
          candidateName: application.candidateName ?? null,
          candidateId: application.candidateId,
          candidateSlug: await getPublicAuthorSlug(ctx, application.candidateId),
          coverLetter: application.coverLetter ?? null,
          cvUrl: cvAvailable
            ? `${env.CONVEX_SITE_URL}/application-cv?t=${application.cvToken}`
            : null,
        };
      }),
    );

    return rows.sort(
      (a, b) =>
        Number(b.highlighted) - Number(a.highlighted) || b.appliedAt - a.appliedAt,
    );
  },
});
