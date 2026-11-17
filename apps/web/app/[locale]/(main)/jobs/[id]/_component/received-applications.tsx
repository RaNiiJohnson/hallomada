"use client";

import { FounderBadge } from "@/components/founder-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTimeTranslations } from "@/hooks/use-time-translations";
import { Link } from "@/i18n/navigation";
import { getRelativeTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex-helpers/react/cache";
import { FileText, Inbox, Star } from "lucide-react";
import { useTranslations } from "next-intl";

/** Applications received for the viewer's own job offer, highlighted first. */
export function ReceivedApplications({ jobId }: { jobId: Id<"JobOffer"> }) {
  const t = useTranslations("jobs.received");
  const timeT = useTimeTranslations();
  const applications = useQuery(api.jobs.queries.listReceivedApplications, {
    jobId,
  });

  if (applications === null) return null;

  return (
    <section className="rounded-lg border bg-muted/30 shadow-sm">
      <div className="flex items-center gap-2 border-b p-4">
        <Inbox className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold">
          {t("title", { count: applications?.length ?? 0 })}
        </h2>
      </div>
      <div className="space-y-3 p-4">
        {applications === undefined ? (
          <Skeleton className="h-20 w-full" />
        ) : applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{t("hint")}</p>
            <ul className="space-y-3">
              {applications.map((application) => {
                const name = application.candidateName ?? t("anonymous");
                return (
                  <li
                    key={application._id}
                    className={cn(
                      "rounded-lg border bg-background p-3",
                      application.highlighted &&
                        "border-amber-400/60 bg-amber-500/5",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {application.candidateSlug ? (
                        <Link
                          href={`/hl/${application.candidateSlug}`}
                          className="font-medium hover:underline"
                        >
                          {name}
                        </Link>
                      ) : (
                        <span className="font-medium">{name}</span>
                      )}
                      <FounderBadge userId={application.candidateId} compact />
                      {application.highlighted && (
                        <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                          <Star className="h-3 w-3" />
                          {t("highlighted")}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {getRelativeTime(application.appliedAt, timeT)}
                    </p>
                    {application.coverLetter && (
                      <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm">
                        {application.coverLetter}
                      </p>
                    )}
                    {application.cvUrl ? (
                      <Button asChild variant="outline" size="sm" className="mt-3">
                        <a href={application.cvUrl} target="_blank" rel="noreferrer">
                          <FileText className="h-4 w-4" />
                          {t("openCv")}
                        </a>
                      </Button>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("cvUnavailable")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
