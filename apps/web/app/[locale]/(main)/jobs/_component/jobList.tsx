"use client";

import { Button } from "@/components/ui/button";
import { api } from "@convex/_generated/api";
import clsx from "clsx";
import { usePaginatedQuery } from "convex/react";
import { Briefcase } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryStates } from "nuqs";
import { toast } from "sonner";
import { JobCard } from "./jobCard";
import { JobPageSkeleton } from "./skeleton";

export function JobList() {
  const t = useTranslations("jobs");

  const [filters] = useQueryStates({
    search: parseAsString.withDefault(""),
    type: parseAsString.withDefault(""),
    contract: parseAsString.withDefault(""),
    workMode: parseAsString.withDefault(""),
    bookmarkedOnly: parseAsString.withDefault("false"),
  });
  const {
    results: jobs,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.jobs.queries.getJobs,
    {
      searchTerm: filters.search,
      workMode:
        filters.workMode === "onSite" ||
        filters.workMode === "hybrid" ||
        filters.workMode === "remote"
          ? filters.workMode
          : undefined,
      contractType:
        filters.contract === "CDI" || filters.contract === "CDD"
          ? filters.contract
          : undefined,
      type: filters.type
        ? (filters.type as
            | "auPair"
            | "training"
            | "voluntary"
            | "internship"
            | "miniJob"
            | "job"
            | "freelance"
            | "scholarship")
        : undefined,
      bookmarkedOnly: filters.bookmarkedOnly === "true" ? true : undefined,
    },
    { initialNumItems: 5 },
  );

  if (status === "LoadingFirstPage") {
    return <JobPageSkeleton />;
  }
  if (jobs.length === 0) {
    return (
      <div className="text-center px-4">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{t("list.emptyTitle")}</h3>
          <p className="text-muted-foreground mb-6">{t("list.emptyDesc")}</p>
        </div>
      </div>
    );
  }

  function loadMoreJobs() {
    if (status === "CanLoadMore") {
      loadMore(1);
    } else {
      toast.info(t("list.allLoaded"));
    }
  }

  return (
    <div className="space-y-3 mt-8">
      {jobs.map((job) => (
        <JobCard key={job.slug} job={job} />
      ))}
      <Button
        variant="outline"
        onClick={loadMoreJobs}
        className={clsx("mx-auto flex items-center mt-5", {
          "cursor-not-allowed opacity-50": status !== "CanLoadMore",
        })}
      >
        {status === "LoadingMore" ? t("list.loading") : t("list.loadMore")}
      </Button>
    </div>
  );
}
