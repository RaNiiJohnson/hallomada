"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { dayKey } from "@convex/statsValues";
import { useQuery } from "convex-helpers/react/cache";
import { BarChart3, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

type Resource =
  | { type: "listing"; id: Id<"RealestateListing"> }
  | { type: "job"; id: Id<"JobOffer"> };

/** View statistics of the viewer's own listing or job offer. */
export function PublicationStats({
  resource,
  className,
}: {
  resource: Resource;
  className?: string;
}) {
  const t = useTranslations("common.stats");
  const [today] = useState(() => dayKey(Date.now()));
  const stats = useQuery(api.stats.getForPublication, { resource, today });

  if (stats === null) return null;

  return (
    <section className={cn("rounded-lg border bg-card shadow-sm", className)}>
      <div className="flex items-center gap-2 border-b p-4">
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold">{t("title")}</h2>
      </div>
      <div className="space-y-5 p-4">
        {stats === undefined ? (
          <Skeleton className="h-40 w-full" />
        ) : !stats.premium ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{t("premiumOnly")}</p>
            <Button asChild size="sm">
              <Link href="/pricing">
                <Sparkles className="h-4 w-4" />
                {t("discover")}
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3">
              <Tile label={t("totalViews")} value={stats.totalViews} />
              <Tile label={t("last7Days")} value={stats.last7Days} />
              <Tile label={t("bookmarks")} value={stats.bookmarks} />
              <Tile label={t(`responses.${resource.type}`)} value={stats.responses} />
            </dl>
            <DailyViews daily={stats.daily} />
            <p className="text-xs text-muted-foreground">{t("note")}</p>
          </>
        )}
      </div>
    </section>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  const locale = useLocale();
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {new Intl.NumberFormat(locale, { notation: "compact" }).format(value)}
      </dd>
    </div>
  );
}

const CHART_HEIGHT = 96;

/** Single-series column chart of daily views over the last 30 days. */
function DailyViews({ daily }: { daily: { day: string; views: number }[] }) {
  const t = useTranslations("common.stats");
  const locale = useLocale();
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...daily.map((entry) => entry.views));
  const formatDay = (day: string, month: "short" | "long" = "short") =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month, timeZone: "UTC" }).format(
      new Date(`${day}T00:00:00Z`),
    );
  const current = active !== null ? daily[active] : null;

  return (
    <figure className="space-y-2">
      <figcaption className="flex flex-col gap-0.5 text-sm">
        <span className="font-medium text-foreground">{t("chartTitle")}</span>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {current
            ? t("tooltip", { count: current.views, date: formatDay(current.day, "long") })
            : t("chartHint")}
        </span>
      </figcaption>
      <div
        className="relative flex items-end gap-[2px] border-b border-border"
        style={{ height: CHART_HEIGHT }}
        onPointerLeave={() => setActive(null)}
        aria-hidden="true"
      >
        {daily.map((entry, index) => {
          const height = entry.views === 0 ? 0 : Math.max(3, (entry.views / max) * CHART_HEIGHT);
          return (
            <div
              key={entry.day}
              className="flex h-full min-w-0 flex-1 items-end"
              onPointerEnter={() => setActive(index)}
            >
              <div
                className={cn(
                  "w-full max-w-6 rounded-t-[4px] bg-primary/80 transition-colors",
                  active === index && "bg-primary",
                )}
                style={{ height }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground" aria-hidden="true">
        <span>{formatDay(daily[0].day)}</span>
        <span>{formatDay(daily[daily.length - 1].day)}</span>
      </div>
      {/* Table view for screen readers and keyboard users. */}
      <table className="sr-only">
        <caption>{t("chartTitle")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("date")}</th>
            <th scope="col">{t("views")}</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((entry) => (
            <tr key={entry.day}>
              <td>{formatDay(entry.day, "long")}</td>
              <td>{entry.views}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
