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
import { FolderOpen, Inbox, Star } from "lucide-react";
import { useTranslations } from "next-intl";

/** Dossiers received for the viewer's own listing, highlighted first. */
export function ReceivedRentalFiles({
  listingId,
}: {
  listingId: Id<"RealestateListing">;
}) {
  const t = useTranslations("rentalFile.received");
  const timeT = useTimeTranslations();
  const rows = useQuery(api.rentalFiles.queries.listReceived, { listingId });

  if (rows === null) return null;

  return (
    <section className="mt-6 rounded-xl border bg-card shadow-sm sm:mt-8">
      <div className="flex items-center gap-2 border-b p-4">
        <Inbox className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold">
          {t("title", { count: rows?.length ?? 0 })}
        </h2>
      </div>
      <div className="space-y-3 p-4">
        {rows === undefined ? (
          <Skeleton className="h-20 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{t("hint")}</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {rows.map((row) => (
                <li
                  key={row._id}
                  className={cn(
                    "rounded-lg border bg-background p-3",
                    row.highlighted && "border-amber-400/60 bg-amber-500/5",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {row.candidateSlug ? (
                      <Link
                        href={`/hl/${row.candidateSlug}`}
                        className="font-medium hover:underline"
                      >
                        {row.candidateName}
                      </Link>
                    ) : (
                      <span className="font-medium">{row.candidateName}</span>
                    )}
                    <FounderBadge userId={row.candidateId} compact />
                    {row.highlighted && (
                      <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                        <Star className="h-3 w-3" />
                        {t("highlighted")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {getRelativeTime(row.sentAt, timeT)}
                  </p>
                  {row.message && (
                    <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm">
                      {row.message}
                    </p>
                  )}
                  {row.token ? (
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <Link href={`/dossier/${row.token}`}>
                        <FolderOpen className="h-4 w-4" />
                        {t("open")}
                      </Link>
                    </Button>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">{t("closed")}</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
