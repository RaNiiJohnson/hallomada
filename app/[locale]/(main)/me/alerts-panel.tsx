"use client";

import { AlertFormDialog } from "@/components/alerts/alert-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { MAX_ALERTS_PER_USER } from "@convex/alerts/values";
import { useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import { BellRing, BriefcaseBusiness, Building2, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

export function AlertsPanel() {
  const t = useTranslations("alerts");
  const alerts = useQuery(api.alerts.queries.listMine, {});
  const full = (alerts?.length ?? 0) >= MAX_ALERTS_PER_USER;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BellRing className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{t("panel.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("panel.description")}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <AlertFormDialog
            kind="listing"
            trigger={
              <Button variant="outline" className="min-h-11 rounded-full" disabled={full}>
                <Building2 className="h-4 w-4" />
                {t("panel.newListing")}
              </Button>
            }
          />
          <AlertFormDialog
            kind="job"
            trigger={
              <Button variant="outline" className="min-h-11 rounded-full" disabled={full}>
                <BriefcaseBusiness className="h-4 w-4" />
                {t("panel.newJob")}
              </Button>
            }
          />
        </div>
        {full && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("form.limitReached")}
          </p>
        )}
      </div>

      {alerts === undefined ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : alerts.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("panel.empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <AlertRow key={alert._id} alert={alert} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AlertRow({ alert }: { alert: Doc<"alerts"> }) {
  const t = useTranslations("alerts");
  const tListing = useTranslations("listing.labels");
  const tJobs = useTranslations("jobs.labels");
  const locale = useLocale();
  const update = useMutation(api.alerts.mutations.update);
  const remove = useMutation(api.alerts.mutations.remove);

  const criteria =
    alert.kind === "listing"
      ? [
          alert.listingMode && tListing(`listingModes.${alert.listingMode}`),
          alert.propertyType && tListing(`listingTypes.${alert.propertyType}`),
          alert.maxPrice !== undefined &&
            t("summary.maxPrice", {
              price: new Intl.NumberFormat(locale, {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              }).format(alert.maxPrice),
            }),
        ]
      : [
          alert.jobType && tJobs(`jobTypes.${alert.jobType}`),
          alert.workMode && tJobs(`workModes.${alert.workMode}`),
        ];
  const details = criteria.filter(Boolean) as string[];
  const Icon = alert.kind === "listing" ? Building2 : BriefcaseBusiness;

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch {
      toast.error(t("form.error"));
    }
  };

  return (
    <li className="rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {t(`summary.${alert.kind}`)} · {alert.city || t("summary.anyCity")}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {details.length === 0 ? (
              <Badge variant="secondary">{t("summary.everything")}</Badge>
            ) : (
              details.map((detail) => (
                <Badge key={detail} variant="secondary">
                  {detail}
                </Badge>
              ))
            )}
            {alert.paused && <Badge variant="outline">{t("summary.paused")}</Badge>}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("panel.delete")}
          onClick={() =>
            void run(async () => {
              await remove({ id: alert._id });
              toast.success(t("panel.deleted"));
            })
          }
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 text-sm">
          {t("panel.active")}
          <Switch
            checked={!alert.paused}
            onCheckedChange={(active) =>
              void run(() => update({ id: alert._id, paused: !active }))
            }
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          {t("panel.email")}
          <Switch
            checked={alert.email}
            onCheckedChange={(email) =>
              void run(() => update({ id: alert._id, email }))
            }
          />
        </label>
      </div>
    </li>
  );
}
