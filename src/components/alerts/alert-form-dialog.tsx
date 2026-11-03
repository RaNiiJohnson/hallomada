"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { jobTypeValues, workModeValues } from "@/lib/job-offer-options";
import { api } from "@convex/_generated/api";
import type { AlertCriteria } from "@convex/alerts/values";
import { useMutation } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

const propertyTypeValues = ["room", "apartment", "house", "studio", "shared"] as const;
const listingModeValues = ["rent", "sale"] as const;
const ANY = "all";

export type AlertKind = AlertCriteria["kind"];

export type AlertDefaults = {
  city?: string;
  propertyType?: string;
  listingMode?: string;
  maxPrice?: number;
  jobType?: string;
};

function pick<T extends string>(values: readonly T[], value: string | undefined) {
  return values.includes(value as T) ? (value as T) : undefined;
}

/** Dialog to create a search alert, optionally prefilled from the current filters. */
export function AlertFormDialog({
  kind,
  defaults = {},
  trigger,
  onCreated,
}: {
  kind: AlertKind;
  defaults?: AlertDefaults;
  trigger: ReactNode;
  onCreated?: () => void;
}) {
  const t = useTranslations("alerts");
  const tListing = useTranslations("listing.labels");
  const tJobs = useTranslations("jobs.labels");
  const locale = useLocale();
  const create = useMutation(api.alerts.mutations.create);

  const [open, setOpen] = useState(false);
  const [city, setCity] = useState("");
  const [propertyType, setPropertyType] = useState<string>(ANY);
  const [listingMode, setListingMode] = useState<string>(ANY);
  const [maxPrice, setMaxPrice] = useState("");
  const [jobType, setJobType] = useState<string>(ANY);
  const [workMode, setWorkMode] = useState<string>(ANY);
  const [email, setEmail] = useState(true);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCity(defaults.city ?? "");
    setPropertyType(pick(propertyTypeValues, defaults.propertyType) ?? ANY);
    setListingMode(pick(listingModeValues, defaults.listingMode) ?? ANY);
    setMaxPrice(defaults.maxPrice ? String(defaults.maxPrice) : "");
    setJobType(pick(jobTypeValues, defaults.jobType) ?? ANY);
    setWorkMode(ANY);
    setEmail(true);
  };

  const parsedMaxPrice = maxPrice.trim() === "" ? undefined : Number(maxPrice);
  const priceInvalid =
    parsedMaxPrice !== undefined &&
    (!Number.isFinite(parsedMaxPrice) || parsedMaxPrice <= 0);

  const submit = async () => {
    if (priceInvalid) return;
    const trimmedCity = city.trim() || undefined;
    const criteria: AlertCriteria =
      kind === "listing"
        ? {
            kind,
            city: trimmedCity,
            propertyType: pick(propertyTypeValues, propertyType),
            listingMode: pick(listingModeValues, listingMode),
            maxPrice: parsedMaxPrice,
          }
        : {
            kind,
            city: trimmedCity,
            jobType: pick(jobTypeValues, jobType),
            workMode: pick(workModeValues, workMode),
          };
    setSaving(true);
    try {
      await create({
        criteria,
        email,
        locale: locale === "fr" || locale === "de" ? locale : "en",
      });
      toast.success(t("form.created"));
      setOpen(false);
      onCreated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(
        message.includes("limit") ? t("form.limitReached") : t("form.error"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(`form.title.${kind}`)}</DialogTitle>
          <DialogDescription>{t("form.description")}</DialogDescription>
        </DialogHeader>

        <form
          id="alert-form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="alert-city">{t("form.city")}</Label>
            <Input
              id="alert-city"
              value={city}
              maxLength={80}
              placeholder={t("form.cityPlaceholder")}
              onChange={(event) => setCity(event.target.value)}
            />
          </div>

          {kind === "listing" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <OptionSelect
                  id="alert-mode"
                  label={t("form.listingMode")}
                  anyLabel={t("form.any")}
                  value={listingMode}
                  onChange={setListingMode}
                  options={listingModeValues.map((value) => ({
                    value,
                    label: tListing(`listingModes.${value}`),
                  }))}
                />
                <OptionSelect
                  id="alert-type"
                  label={t("form.propertyType")}
                  anyLabel={t("form.any")}
                  value={propertyType}
                  onChange={setPropertyType}
                  options={propertyTypeValues.map((value) => ({
                    value,
                    label: tListing(`listingTypes.${value}`),
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alert-price">{t("form.maxPrice")}</Label>
                <Input
                  id="alert-price"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={maxPrice}
                  placeholder={t("form.maxPricePlaceholder")}
                  aria-invalid={priceInvalid}
                  onChange={(event) => setMaxPrice(event.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <OptionSelect
                id="alert-job-type"
                label={t("form.jobType")}
                anyLabel={t("form.any")}
                value={jobType}
                onChange={setJobType}
                options={jobTypeValues.map((value) => ({
                  value,
                  label: tJobs(`jobTypes.${value}`),
                }))}
              />
              <OptionSelect
                id="alert-work-mode"
                label={t("form.workMode")}
                anyLabel={t("form.any")}
                value={workMode}
                onChange={setWorkMode}
                options={workModeValues.map((value) => ({
                  value,
                  label: tJobs(`workModes.${value}`),
                }))}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor="alert-email">{t("form.email")}</Label>
              <p className="text-xs text-muted-foreground">{t("form.emailHint")}</p>
            </div>
            <Switch id="alert-email" checked={email} onCheckedChange={setEmail} />
          </div>
        </form>

        <DialogFooter>
          <Button type="submit" form="alert-form" disabled={saving || priceInvalid}>
            {saving ? t("form.saving") : t("form.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OptionSelect({
  id,
  label,
  anyLabel,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  anyLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{anyLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
