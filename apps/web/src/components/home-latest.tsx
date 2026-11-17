"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { PostCard } from "@app/[locale]/(main)/communities/_component/List/PostCard";
import { JobCard } from "@app/[locale]/(main)/jobs/_component/jobCard";
import { ListingCard } from "@app/[locale]/(main)/listing/_component/List/listingCard";
import { ProviderCardItem } from "@app/[locale]/(main)/providers/_components/provider-directory";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { usePaginatedQuery, useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import { providerCategoryValues } from "@hallomada/shared/providers";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Children, type ReactNode } from "react";

/**
 * What's new on each service, in place of the old "Nos services" cards: each
 * block carries its service's one-line pitch and shortcut filters, then the
 * latest items. Jobs, housing and providers first, the discussions last.
 */
export function HomeLatest() {
  const t = useTranslations("home.latest");
  const tHome = useTranslations("home");
  const tJobs = useTranslations("jobs");
  const tListing = useTranslations("listing");
  const tProviders = useTranslations("providers");

  return (
    <section className="py-8 sm:py-12 md:py-16 px-4 shrink-0">
      <div className="max-w-6xl mx-auto space-y-14">
        <LatestBlock
          title={t("jobs")}
          href="/jobs"
          description={tHome("opportunitiesDescription")}
          shortcuts={jobShortcutTypes.map((type) => ({
            href: `/jobs?type=${type}`,
            label: tJobs(`labels.jobTypes.${type}`),
          }))}
        >
          <JobsPreview />
        </LatestBlock>

        <LatestListings
          description={tHome("housingDescription")}
          shortcuts={[
            {
              href: "/listing?mode=rent",
              label: tListing("labels.listingModes.rent"),
            },
            {
              href: "/listing?mode=sale",
              label: tListing("labels.listingModes.sale"),
            },
            ...listingShortcutTypes.map((type) => ({
              href: `/listing?type=${type}`,
              label: tListing(`labels.listingTypes.${type}`),
            })),
          ]}
        />

        <LatestProviders
          description={tHome("providersDescription")}
          shortcuts={providerCategoryValues
            .filter((category) => category !== "other")
            .map((category) => ({
              href: `/providers?category=${category}`,
              label: tProviders(`categories.${category}`),
            }))}
        />

        <LatestBlock
          title={t("posts")}
          href="/communities"
          description={tHome("communityDescription")}
        >
          <PostsPreview />
        </LatestBlock>
      </div>
    </section>
  );
}

// The job types and housing kinds people look for most, as one-tap filters.
const jobShortcutTypes = [
  "auPair",
  "training",
  "internship",
  "job",
  "miniJob",
] as const;
const listingShortcutTypes = ["shared", "room", "apartment"] as const;

type Shortcut = { href: string; label: string };

/* ---------- Shared pieces ---------- */

function SeeAllLink({ href, className }: { href: string; className?: string }) {
  const t = useTranslations("home.latest");
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary",
        className,
      )}
    >
      {t("seeAll")}
      <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

/** Filter chips that open the list page already filtered. */
function ShortcutChips({ shortcuts }: { shortcuts: Shortcut[] }) {
  return (
    <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
      {shortcuts.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="shrink-0 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary dark:bg-card/35"
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

function LatestBlock({
  title,
  href,
  description,
  shortcuts,
  children,
}: {
  title: string;
  href: string;
  /** The service's one-line pitch, under the title. */
  description?: string;
  shortcuts?: Shortcut[];
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <SeeAllLink href={href} />
      </div>
      {shortcuts && <ShortcutChips shortcuts={shortcuts} />}
      {children}
    </div>
  );
}

function Empty() {
  const t = useTranslations("home.latest");
  return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
}

function SkeletonList({
  count,
  className,
  itemClassName,
}: {
  count: number;
  className?: string;
  itemClassName: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={itemClassName} />
      ))}
    </div>
  );
}

/** The four latest jobs, two columns from tablets up. */
function JobsPreview({ count = 4 }: { count?: number }) {
  const { results, status } = usePaginatedQuery(
    api.jobs.queries.getJobs,
    {},
    { initialNumItems: count },
  );
  const jobs = results.slice(0, count);

  if (status === "LoadingFirstPage") {
    return (
      <SkeletonList
        count={count}
        className="grid gap-3 md:grid-cols-2"
        itemClassName="h-32 rounded-lg"
      />
    );
  }
  if (jobs.length === 0) return <Empty />;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {jobs.map((job) => (
        <JobCard key={job._id} job={job} />
      ))}
    </div>
  );
}

/** The three latest posts as a row of cards. */
function PostsPreview({ count = 3 }: { count?: number }) {
  const likePost = useMutation(api.posts.likes.mutations.likePost);
  const feed = useQuery(api.posts.queries.getSortedPosts, {
    order: "desc",
    offset: 0,
    numItems: count,
  });
  const posts = feed?.posts ?? [];

  const handleLike = async (postId: Id<"posts">) => {
    await likePost({ postId });
  };

  if (feed === undefined) {
    return (
      <SkeletonList
        count={Math.min(count, 3)}
        className="grid gap-6 md:grid-cols-3"
        itemClassName="h-56 rounded-lg"
      />
    );
  }
  if (posts.length === 0) return <Empty />;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {posts.map((post) => (
        <div
          key={post._id}
          className="grid overflow-hidden rounded-lg border [&>*]:border-b-0"
        >
          <PostCard post={post} onLike={handleLike} />
        </div>
      ))}
    </div>
  );
}

// How many housing and provider cards the carousels show before "see all".
const CAROUSEL_ITEMS = 8;

// About one and a half cards on phones, two-plus on tablets, three-plus on
// desktop: the next card always peeks in, so the row reads as draggable.
const slideClasses = "basis-[85%] pl-0 sm:basis-[46%] lg:basis-[31%]";

/**
 * Draggable shadcn carousel without arrows: Embla handles mouse and touch
 * dragging, and the left/right arrow keys once the row has focus.
 */
function HomeCarousel({ children }: { children: ReactNode }) {
  return (
    <Carousel
      opts={{ align: "start", containScroll: "trimSnaps" }}
      tabIndex={0}
      className="min-w-0 cursor-grab rounded-xl outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing [&_img]:pointer-events-none"
    >
      <CarouselContent className="ml-0 gap-5">
        {Children.map(children, (child) => (
          <CarouselItem className={slideClasses}>{child}</CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

function CarouselSkeleton({ itemClassName }: { itemClassName: string }) {
  return (
    <div className="flex gap-5 overflow-hidden">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className={cn("shrink-0", slideClasses, itemClassName)} />
      ))}
    </div>
  );
}

function LatestListings({
  description,
  shortcuts,
}: {
  description?: string;
  shortcuts?: Shortcut[];
}) {
  const t = useTranslations("home.latest");
  const { results, status } = usePaginatedQuery(
    api.listings.queries.getListing,
    {},
    { initialNumItems: CAROUSEL_ITEMS },
  );
  const listings = results.slice(0, CAROUSEL_ITEMS);

  return (
    <LatestBlock
      title={t("listings")}
      href="/listing"
      description={description}
      shortcuts={shortcuts}
    >
      {status === "LoadingFirstPage" ? (
        <CarouselSkeleton itemClassName="h-80 rounded-xl" />
      ) : listings.length === 0 ? (
        <Empty />
      ) : (
        <HomeCarousel>
          {listings.map((listing) => (
            <ListingCard key={listing._id} listing={listing} />
          ))}
        </HomeCarousel>
      )}
    </LatestBlock>
  );
}

function LatestProviders({
  description,
  shortcuts,
}: {
  description?: string;
  shortcuts?: Shortcut[];
}) {
  const t = useTranslations("home.latest");
  const { results, status } = usePaginatedQuery(
    api.providers.queries.listProviders,
    {},
    { initialNumItems: CAROUSEL_ITEMS },
  );
  const providers = results.slice(0, CAROUSEL_ITEMS);

  return (
    <LatestBlock
      title={t("providers")}
      href="/providers"
      description={description}
      shortcuts={shortcuts}
    >
      {status === "LoadingFirstPage" ? (
        <CarouselSkeleton itemClassName="h-64 rounded-xl" />
      ) : providers.length === 0 ? (
        <Empty />
      ) : (
        <HomeCarousel>
          {providers.map((provider) => (
            // Stretch every card to the tallest one in the row.
            <div key={provider._id} className="grid h-full">
              <ProviderCardItem provider={provider} />
            </div>
          ))}
        </HomeCarousel>
      )}
    </LatestBlock>
  );
}
