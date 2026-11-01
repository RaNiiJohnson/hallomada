"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTimeTranslations } from "@/hooks/use-time-translations";
import { Link } from "@/i18n/navigation";
import { getRelativeTime } from "@/lib/date";
import { api } from "@convex/_generated/api";
import clsx from "clsx";
import { usePaginatedQuery } from "convex/react";
import { Briefcase, Clock, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryStates } from "nuqs";
import { toast } from "sonner";
import { JobBookmarkButton } from "./JobBookmarkButton";
import { contractLabelKeys } from "@/lib/job-offer-options";
import { SalaryDisplay } from "./salary";
import { JobPageSkeleton } from "./skeleton";

export function JobList() {
  const t = useTranslations("jobs");

  const [filters] = useQueryStates({
    search: parseAsString.withDefault(""),
    type: parseAsString.withDefault(""),
    contract: parseAsString.withDefault(""),
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

  const timeT = useTimeTranslations();

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
        <Link
          key={job.slug}
          href={`/jobs/${job.slug}`}
          className="group block rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          <div
            className={clsx(
              "rounded-lg border border-border bg-card p-4 transition-all duration-150 hover:border-primary/30 hover:shadow-md active:scale-[0.99] active:border-primary active:ring-1 active:ring-primary dark:bg-card/35 motion-reduce:transform-none",
              job.status === "pending" &&
                "border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/5",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1 line-clamp-1">
                  {job.title}
                </h3>

                {/* Company */}
                {job.salary !== undefined && (
                  <div className="flex items-center gap-1 mb-2">
                    <SalaryDisplay
                      salary={job.salary}
                      className="text-foreground"
                    />
                    {job.salaryPeriod && (
                      <span className="text-primary text-xs font-normal">
                        /
                        {t(
                          `labels.salaryPeriods.${job.salaryPeriod}` as Parameters<
                            typeof t
                          >[0],
                        )}
                      </span>
                    )}
                  </div>
                )}

                {/* Location & Type */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {job.workMode === "remote"
                        ? job.remoteLocation || t("labels.workModes.remote")
                        : job.city}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    <span>
                      {t(
                        `labels.jobTypes.${job.type}` as Parameters<
                          typeof t
                        >[0],
                      ) ?? job.type}
                    </span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {job.status === "pending" ? (
                    <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500">
                      {t("list.pending")}
                    </Badge>
                  ) : null}
                  <Badge
                    variant="secondary"
                    className="bg-secondary/50 hover:bg-secondary/70 text-xs font-normal"
                  >
                    {contractLabelKeys(job)
                      .map((key) => t(key as Parameters<typeof t>[0]))
                      .join(" · ")}
                  </Badge>
                  {job.duration && (
                    <Badge variant="outline" className="text-xs font-normal">
                      <Clock className="h-3 w-3 mr-1" />
                      {job.duration}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="flex flex-col items-end gap-1">
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {getRelativeTime(job._creationTime, timeT)}
                </div>
                <JobBookmarkButton
                  jobId={job._id}
                  initialBookmark={job.isBookmarked}
                />
              </div>
            </div>
          </div>
        </Link>
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
