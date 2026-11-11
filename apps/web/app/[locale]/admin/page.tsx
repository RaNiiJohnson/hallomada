"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { getPostHogDashboardUrl } from "@/lib/admin-navigation";
import { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { useQuery } from "convex-helpers/react/cache";
import { useConvex } from "convex/react";
import {
  ArrowRight,
  Ban,
  ExternalLink,
  Flag,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

const WINDOW_DAYS = 7;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;
const POSTHOG_DASHBOARD_URL = getPostHogDashboardUrl(
  process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL,
);

type DashboardData = FunctionReturnType<typeof api.auth.admin.getDashboard>;

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-xl border bg-card p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-9 w-20" />
            <Skeleton className="mt-3 h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div className="rounded-xl border bg-card p-5">
          <Skeleton className="h-6 w-40" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-5 h-20 w-full" />
          <Skeleton className="mt-3 h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");
  const locale = useLocale();
  const convex = useConvex();
  const pendingPublicationCount = useQuery(
    api.publicationModeration.getPendingCount,
    {},
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(() => {
    const asOf = Date.now();
    return convex.query(api.auth.admin.getDashboard, {
      windowStart: asOf - WINDOW_MS,
      asOf,
    });
  }, [convex]);

  const refreshDashboard = useCallback(async () => {
    setError(null);
    if (data) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const result = await fetchDashboard();
      setData(result);
    } catch {
      setError(t("errorDescription"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [data, fetchDashboard, t]);

  useEffect(() => {
    let active = true;

    void fetchDashboard()
      .then((result) => {
        if (!active) return;
        setData(result);
      })
      .catch(() => {
        if (!active) return;
        setError(t("errorDescription"));
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchDashboard, t]);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale],
  );
  const updatedFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  if (isLoading && !data) return <DashboardSkeleton />;

  if (!data) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold">{t("errorTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? t("errorDescription")}
          </p>
          <Button className="mt-5" onClick={() => void refreshDashboard()}>
            {t("retry")}
          </Button>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      key: "total",
      label: t("metrics.total"),
      value: data.totalMembers,
      helper: t("metrics.totalHelper"),
      icon: Users,
    },
    {
      key: "new",
      label: t("metrics.new", { days: WINDOW_DAYS }),
      value: data.newMembers,
      helper: t("metrics.newHelper", {
        date: dateFormatter.format(new Date(data.windowStart)),
      }),
      icon: UserPlus,
    },
    {
      key: "banned",
      label: t("metrics.banned"),
      value: data.bannedMembers,
      helper: t("metrics.bannedHelper"),
      icon: Ban,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("lastUpdated", {
              date: updatedFormatter.format(new Date(data.asOf)),
            })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refreshDashboard()}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {t("refresh")}
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {pendingPublicationCount !== undefined && pendingPublicationCount > 0 ? (
        <Link
          href="/admin/moderation"
          className="flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Flag className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">
              {t("moderationAlert.title", {
                count: pendingPublicationCount,
              })}
            </span>
            <span className="block text-sm text-muted-foreground">
              {t("moderationAlert.description")}
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-primary" />
        </Link>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.key} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </h3>
              <metric.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
              {metric.value.toLocaleString(locale)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {metric.helper}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">{t("recent.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("recent.description")}
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/users" className="gap-1">
                {t("recent.viewAll")}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {data.recentMembers.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("recent.emptyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("recent.emptyDescription")}
              </p>
            </div>
          ) : (
            <div className="mt-5 divide-y">
              {data.recentMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <Avatar className="size-9">
                    <AvatarImage src={member.image ?? ""} alt={member.name} />
                    <AvatarFallback>
                      {member.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">
                      {dateFormatter.format(new Date(member.createdAt))}
                    </p>
                    {member.city ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {member.city}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold">{t("actions.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("actions.description")}
          </p>
          <div className="mt-5 space-y-3">
            <Button variant="outline" className="h-auto w-full justify-between p-4" asChild>
              <Link href="/admin/users">
                <span className="text-left">
                  <span className="block font-medium">
                    {t("actions.usersTitle")}
                  </span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {t("actions.usersDescription")}
                  </span>
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            {POSTHOG_DASHBOARD_URL ? (
              <Button
                variant="outline"
                className="h-auto w-full justify-between p-4"
                asChild
              >
                <a
                  href={POSTHOG_DASHBOARD_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <span className="text-left">
                    <span className="block font-medium">
                      {t("actions.analyticsTitle")}
                    </span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {t("actions.analyticsDescription")}
                    </span>
                  </span>
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            ) : (
              <div className="rounded-lg border border-dashed p-4">
                <p className="text-sm font-medium">
                  {t("actions.analyticsTitle")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("actions.analyticsUnconfigured")}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
