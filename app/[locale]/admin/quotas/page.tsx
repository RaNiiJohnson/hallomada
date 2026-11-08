"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@convex/_generated/api";
import {
  MAX_PUBLICATION_QUOTA,
  type PlanQuotas,
  type QuotaPlan,
} from "@convex/publicationQuotaValues";
import { useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

const FIELDS = [
  { name: "listingsPerMonth", label: "listings" },
  { name: "jobsPerMonth", label: "jobs" },
  { name: "providersPerMonth", label: "providers" },
  { name: "applicationsPerMonth", label: "applications" },
] as const;

type QuotaField = (typeof FIELDS)[number]["name"];
type QuotaDraft = Record<QuotaField, { value: string; unlimited: boolean }>;

function toDraft(value: number | null) {
  return { value: value === null ? "" : String(value), unlimited: value === null };
}

function QuotaForm({ plan, initial }: { plan: QuotaPlan; initial: PlanQuotas }) {
  const t = useTranslations("admin.quotas");
  const update = useMutation(api.publicationQuotas.update);
  const [draft, setDraft] = useState<QuotaDraft>({
    listingsPerMonth: toDraft(initial.listingsPerMonth),
    jobsPerMonth: toDraft(initial.jobsPerMonth),
    providersPerMonth: toDraft(initial.providersPerMonth),
    applicationsPerMonth: toDraft(initial.applicationsPerMonth),
  });
  const [saving, setSaving] = useState(false);

  // `null` = illimité, sent as-is to the server.
  const parsed = FIELDS.map(({ name }) =>
    draft[name].unlimited ? null : Number(draft[name].value),
  );
  const valid = parsed.every(
    (value) =>
      value === null ||
      (Number.isInteger(value) && value >= 1 && value <= MAX_PUBLICATION_QUOTA),
  );

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await update({
        plan,
        listingsPerMonth: parsed[0],
        jobsPerMonth: parsed[1],
        providersPerMonth: parsed[2],
        applicationsPerMonth: parsed[3],
      });
      toast.success(t("saved"));
    } catch {
      toast.error(t("error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="space-y-6 rounded-xl border bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="space-y-1">
        <h3 className="font-semibold">{t(`plans.${plan}.title`)}</h3>
        <p className="text-sm text-muted-foreground">
          {t(`plans.${plan}.description`)}
        </p>
      </div>
      <FieldGroup className="space-y-4">
        {FIELDS.map(({ name, label }) => (
          <Field key={name}>
            <FieldLabel htmlFor={`quota-${plan}-${name}`}>{t(label)}</FieldLabel>
            <div className="flex items-center gap-3">
              <Input
                id={`quota-${plan}-${name}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_PUBLICATION_QUOTA}
                step={1}
                disabled={draft[name].unlimited}
                value={draft[name].value}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    [name]: { ...current[name], value: event.target.value },
                  }))
                }
                aria-describedby={`quota-${plan}-${name}-hint`}
              />
              <Checkbox
                id={`quota-${plan}-${name}-unlimited`}
                checked={draft[name].unlimited}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    [name]: { ...current[name], unlimited: checked === true },
                  }))
                }
              />
              <FieldLabel
                htmlFor={`quota-${plan}-${name}-unlimited`}
                className="cursor-pointer font-normal"
              >
                {t("unlimited")}
              </FieldLabel>
            </div>
            <p
              id={`quota-${plan}-${name}-hint`}
              className="text-xs text-muted-foreground"
            >
              {t("hint", { max: MAX_PUBLICATION_QUOTA })}
            </p>
          </Field>
        ))}
      </FieldGroup>
      <Button type="submit" disabled={!valid || saving} className="w-full">
        {saving ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

function toDateInput(timestamp: number | null) {
  if (timestamp === null) return "";
  return new Date(timestamp).toISOString().slice(0, 10);
}

function FounderProgramForm({
  closesAt,
  count,
  max,
}: {
  closesAt: number | null;
  count: number;
  max: number;
}) {
  const t = useTranslations("admin.founders");
  const setClosesAt = useMutation(api.founders.setProgramClosesAt);
  const [date, setDate] = useState(toDateInput(closesAt));
  const [saving, setSaving] = useState(false);

  const save = async (value: number | null) => {
    setSaving(true);
    try {
      await setClosesAt({ closesAt: value });
      toast.success(t("saved"));
    } catch {
      toast.error(t("error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="max-w-md space-y-4 rounded-xl border bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        // The program closes at midnight UTC at the start of the chosen day.
        if (date) void save(Date.parse(`${date}T00:00:00Z`));
      }}
    >
      <div className="space-y-1">
        <h3 className="font-semibold">{t("title")}</h3>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <p className="text-sm font-medium">{t("places", { count, max })}</p>
      <p className="text-sm font-medium">
        {closesAt === null
          ? t("statusOpen")
          : t("statusClosesAt", { date: new Date(closesAt) })}
      </p>
      <Field>
        <FieldLabel htmlFor="founder-closes-at">{t("closesAt")}</FieldLabel>
        <DatePicker id="founder-closes-at" value={date} onChange={setDate} />
      </Field>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={!date || saving} className="flex-1">
          {t("save")}
        </Button>
        {closesAt !== null && (
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            className="flex-1"
            onClick={() => {
              setDate("");
              void save(null);
            }}
          >
            {t("reopen")}
          </Button>
        )}
      </div>
    </form>
  );
}

export default function QuotasPage() {
  const t = useTranslations("admin.quotas");
  const quotas = useQuery(api.publicationQuotas.get, {});
  const founderProgram = useQuery(api.founders.getProgram, {});

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      {quotas === undefined ? (
        <div aria-label={t("loading")} className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <QuotaForm plan="free" initial={quotas.free} />
          <QuotaForm plan="premium" initial={quotas.premium} />
        </div>
      )}
      {founderProgram === undefined ? (
        <Skeleton className="h-48 w-full max-w-md rounded-xl" />
      ) : (
        <FounderProgramForm
          closesAt={founderProgram.closesAt}
          count={founderProgram.count}
          max={founderProgram.max}
        />
      )}
    </div>
  );
}
