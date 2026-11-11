"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@convex/_generated/api";
import { usePaginatedQuery } from "convex-helpers/react/cache";
import { Loader2, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

const PAGE_SIZE = 20;

function AuditSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-6" aria-label={label}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="grid gap-3 border-b p-4 last:border-0 md:grid-cols-[minmax(10rem,0.8fr)_minmax(12rem,1fr)_minmax(12rem,1fr)_auto] md:items-center"
          >
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const t = useTranslations("admin.audit");
  const locale = useLocale();
  const { results, status, loadMore } = usePaginatedQuery(
    api.adminAudit.list,
    {},
    { initialNumItems: PAGE_SIZE },
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  if (status === "LoadingFirstPage") {
    return <AuditSkeleton label={t("loading")} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {results.length === 0 ? (
        <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
          <div className="max-w-md">
            <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-muted">
              <ShieldCheck className="size-5 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("emptyDescription")}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="hidden border-b bg-muted/30 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[minmax(10rem,0.8fr)_minmax(12rem,1fr)_minmax(12rem,1fr)_auto] md:gap-3">
            <span>{t("columns.action")}</span>
            <span>{t("columns.administrator")}</span>
            <span>{t("columns.target")}</span>
            <span>{t("columns.date")}</span>
          </div>

          <div className="divide-y">
            {results.map((event) => {
              const metadataLabel = event.metadata?.role
                ? t("details.role", {
                    value: t(`roles.${event.metadata.role}`),
                  })
                : event.metadata?.userType
                  ? t("details.userType", {
                      value: t(`userTypes.${event.metadata.userType}`),
                    })
                  : null;

              return (
                <article
                  key={event._id}
                  className="grid gap-3 p-4 md:grid-cols-[minmax(10rem,0.8fr)_minmax(12rem,1fr)_minmax(12rem,1fr)_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground md:hidden">
                      {t("columns.action")}
                    </span>
                    <Badge variant="outline">
                      {t(`actions.${event.action}`)}
                    </Badge>
                    {metadataLabel ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {metadataLabel}
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <span className="block text-xs font-medium text-muted-foreground md:hidden">
                      {t("columns.administrator")}
                    </span>
                    <p className="truncate text-sm font-medium">
                      {event.administratorLabel ?? event.administratorId}
                    </p>
                    {event.administratorLabel ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {event.administratorId}
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <span className="block text-xs font-medium text-muted-foreground md:hidden">
                      {t("columns.target")}
                    </span>
                    <p className="truncate text-sm font-medium">
                      {event.targetLabel ?? event.targetId}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t(`targetTypes.${event.targetType}`)} · {event.targetId}
                    </p>
                  </div>

                  <div className="shrink-0 md:text-right">
                    <span className="block text-xs font-medium text-muted-foreground md:hidden">
                      {t("columns.date")}
                    </span>
                    <time
                      dateTime={new Date(event.occurredAt).toISOString()}
                      className="text-sm text-muted-foreground"
                    >
                      {dateFormatter.format(new Date(event.occurredAt))}
                    </time>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => loadMore(PAGE_SIZE)}
            disabled={status === "LoadingMore"}
            className="gap-2"
          >
            {status === "LoadingMore" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {t(status === "LoadingMore" ? "loadingMore" : "loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
