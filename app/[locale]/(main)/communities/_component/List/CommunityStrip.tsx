"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { api } from "@convex/_generated/api";
import { usePaginatedQuery } from "convex-helpers/react/cache";
import { ArrowRight, Hash, MapPin, Users } from "lucide-react";
import { useTranslations } from "next-intl";

const STRIP_SIZE = 8;

/** A row of community pills under the hero, in the spot where the other
 * sections show their filter chips. Scrolls sideways on small screens. */
export function CommunityStrip() {
  const t = useTranslations("communities");
  const { results, status } = usePaginatedQuery(
    api.communities.queries.getCommunitiesPreview,
    {},
    { initialNumItems: STRIP_SIZE },
  );

  if (status !== "LoadingFirstPage" && results.length === 0) return null;

  return (
    <nav
      aria-label={t("exploreAction")}
      className="max-w-4xl mx-auto px-4 pt-6"
    >
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:flex-wrap sm:justify-center">
        {status === "LoadingFirstPage"
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-32 shrink-0 rounded-full" />
            ))
          : results.slice(0, STRIP_SIZE).map((community) => {
              const Icon =
                community.kind === "city"
                  ? MapPin
                  : community.kind === "theme"
                    ? Hash
                    : Users;

              return (
                <Link
                  key={community._id}
                  href={`/communities/${community.slug}`}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border bg-card/50 pr-3.5 pl-3 text-sm transition-colors hover:border-primary/50 hover:bg-primary/10"
                >
                  <Icon className="size-4 text-primary" />
                  <span className="max-w-44 truncate font-medium">
                    {community.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                    <Users className="size-3" aria-hidden />
                    {community.membersCount}
                  </span>
                </Link>
              );
            })}

        <Link
          href="/communities/explore"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          {t("exploreAction")}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </nav>
  );
}
