"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { api } from "@convex/_generated/api";
import { usePaginatedQuery } from "convex-helpers/react/cache";
import { FileText, LayoutGrid, Users } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ExploreCommunitiesPage() {
  const t = useTranslations("communities.explore");
  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.queries.getCommunitiesPreview,
    {},
    { initialNumItems: 25 },
  );

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="size-6 text-primary" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("description")}
          </p>
        </div>

        <div className="rounded-md border bg-card divide-y divide-border overflow-hidden dark:bg-card/35">
          {results.map((community) => (
            <Link
              key={community._id}
              href={`/communities/${community.slug}`}
              className="group flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors"
            >
              <div className="shrink-0 size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Users className="size-4" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col">
                <span className="font-medium text-sm truncate group-hover:underline">
                  {community.name}
                </span>
                <span className="hidden sm:block text-xs text-muted-foreground truncate">
                  {community.description}
                </span>
              </div>

              <div className="hidden md:flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="size-3" />
                  {community.membersCount}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="size-3" />
                  {community.postsCount}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 h-7 px-3 text-xs"
                asChild
              >
                <span>{t("visit")}</span>
              </Button>
            </Link>
          ))}
        </div>

        {status === "LoadingFirstPage" && (
          <div className="text-center mt-8 text-sm text-muted-foreground">
            {t("loadingFirstPage")}
          </div>
        )}

        {status === "LoadingMore" && (
          <div className="text-center mt-8 text-sm text-muted-foreground">
            {t("loadingMore")}
          </div>
        )}

        {status === "CanLoadMore" && (
          <div className="flex justify-center mt-8">
            <Button onClick={() => loadMore(25)} variant="outline" size="sm">
              {t("canLoadMore")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
