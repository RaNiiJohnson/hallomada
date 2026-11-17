import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex-helpers/react/cache";
import { useAction } from "convex/react";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";

const SUPPORTED = ["fr", "en", "de"] as const;
type SupportedLang = (typeof SUPPORTED)[number];

function useSupportedLang(): SupportedLang | null {
  const locale = useLocale();
  return (SUPPORTED as readonly string[]).includes(locale)
    ? (locale as SupportedLang)
    : null;
}

/**
 * Shared logic: if the cache is loaded but the item is missing or stale,
 * trigger the translation exactly once per (resource, language, version).
 * In case of failure, clear the "in-progress" state (avoiding an infinite spinner)
 * and do not retry in a loop.
 */
function useAutoTranslate<T extends { sourceUpdatedAt: number }>({
  resourceKey,
  sourceUpdatedAt,
  cached,
  run,
}: {
  resourceKey: string | null; // null = nothing to translate (not loaded / locale not supported)
  sourceUpdatedAt: number | undefined;
  cached: T | null | undefined; // undefined = query loading
  run: (() => Promise<unknown>) | null;
}) {
  const requested = useRef<string | null>(null);
  const runRef = useRef(run);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    runRef.current = run;
  });

  const currentKey =
    resourceKey && sourceUpdatedAt !== undefined
      ? `${resourceKey}:${sourceUpdatedAt}`
      : null;

  const isFresh =
    !!cached &&
    sourceUpdatedAt !== undefined &&
    cached.sourceUpdatedAt === sourceUpdatedAt;

  const hasFailed = currentKey !== null && failedKey === currentKey;

  useEffect(() => {
    if (!currentKey || cached === undefined || isFresh) return;
    if (requested.current === currentKey) return; // already attempted (success or failure)

    requested.current = currentKey;
    runRef.current?.().catch(() => setFailedKey(currentKey));
  }, [currentKey, cached, isFresh]);

  return {
    translation: isFresh ? (cached as T) : null,
    isTranslating: !!currentKey && !isFresh && !hasFailed,
  };
}

// ---------------- JOB ----------------
type JobInput = {
  _id: Id<"JobOffer">;
  title: string;
  description: string;
  city: string;
  updatedAt: number;
};

export function useTranslatedJob(job: JobInput | null | undefined) {
  const lang = useSupportedLang();
  const translateJob = useAction(api.jobs.translate.translateJob);
  const cached = useQuery(
    api.jobs.translate.getTranslation,
    job && lang ? { jobId: job._id, language: lang } : "skip",
  );

  const { translation, isTranslating } = useAutoTranslate({
    resourceKey: job && lang ? `${job._id}:${lang}` : null,
    sourceUpdatedAt: job?.updatedAt,
    cached,
    run:
      job && lang
        ? () => translateJob({ jobId: job._id, targetLanguage: lang })
        : null,
  });

  const [showOriginal, setShowOriginal] = useState(false);

  // Le bouton n'a de sens que si la traduction diffère de l'original
  // const canToggle =
  //   !!job &&
  //   canToggle={translated.canToggle}
  //   !!translation &&
  //   (translation.title !== job.title ||
  //     translation.description !== job.description ||
  //     translation.city !== job.city);

  const active = translation && !showOriginal ? translation : null;

  return {
    title: active?.title ?? job?.title,
    description: active?.description ?? job?.description,
    city: active?.city ?? job?.city,
    isTranslating,
    // canToggle,
    showOriginal,
    toggleOriginal: () => setShowOriginal((v) => !v),
  };
}

// ---------------- LISTING ----------------
type ListingInput = {
  _id: Id<"RealestateListing">;
  title: string;
  description: string;
  city: string;
  extras: string[];
  updatedAt: number;
};

export function useTranslatedListing(listing: ListingInput | null | undefined) {
  const lang = useSupportedLang();
  const translateListing = useAction(api.listings.translate.translateListing);
  const cached = useQuery(
    api.listings.translate.getTranslation,
    listing && lang ? { listingId: listing._id, language: lang } : "skip",
  );

  const { translation, isTranslating } = useAutoTranslate({
    resourceKey: listing && lang ? `${listing._id}:${lang}` : null,
    sourceUpdatedAt: listing?.updatedAt,
    cached,
    run:
      listing && lang
        ? () =>
            translateListing({ listingId: listing._id, targetLanguage: lang })
        : null,
  });

  const [showOriginal, setShowOriginal] = useState(false);

  const canToggle =
    !!listing &&
    !!translation &&
    (translation.title !== listing.title ||
      translation.description !== listing.description ||
      translation.city !== listing.city);

  const active = translation && !showOriginal ? translation : null;

  return {
    title: active?.title ?? listing?.title,
    description: active?.description ?? listing?.description,
    city: active?.city ?? listing?.city,
    isTranslating,
    canToggle,
    showOriginal,
    toggleOriginal: () => setShowOriginal((v) => !v),
  };
}

// ---------------- POST ----------------
type PostInput = {
  _id: Id<"posts">;
  title: string;
  content: string;
  _creationTime: number;
  updatedAt?: number;
};

export function useTranslatedPost(post: PostInput | null | undefined) {
  const lang = useSupportedLang();
  const translatePost = useAction(api.posts.translate.translatePost);
  const cached = useQuery(
    api.posts.translate.getTranslation,
    post && lang ? { postId: post._id, language: lang } : "skip",
  );

  const { translation, isTranslating } = useAutoTranslate({
    resourceKey: post && lang ? `${post._id}:${lang}` : null,
    // Same rule as server-side: updatedAt ?? _creationTime
    sourceUpdatedAt: post ? (post.updatedAt ?? post._creationTime) : undefined,
    cached,
    run:
      post && lang
        ? () => translatePost({ postId: post._id, targetLanguage: lang })
        : null,
  });

  const [showOriginal, setShowOriginal] = useState(false);

  const canToggle =
    !!post &&
    !!translation &&
    (translation.title !== post.title || translation.content !== post.content);

  const active = translation && !showOriginal ? translation : null;

  return {
    title: active?.title ?? post?.title,
    content: active?.content ?? post?.content,
    isTranslating,
    canToggle,
    showOriginal,
    toggleOriginal: () => setShowOriginal((v) => !v),
  };
}
