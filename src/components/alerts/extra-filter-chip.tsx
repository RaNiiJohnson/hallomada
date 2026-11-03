"use client";

import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";

/**
 * Shows a filter that only saved searches set (rent/sale, work mode), which
 * the page's own filter panel does not display, so it can be removed.
 */
export function ExtraFilterChip({ kind }: { kind: "listing" | "job" }) {
  const t = useTranslations("alerts");
  const tListing = useTranslations("listing.labels");
  const tJobs = useTranslations("jobs.labels");
  const param = kind === "listing" ? "mode" : "workMode";
  const [value, setValue] = useQueryState(param, parseAsString.withDefault(""));

  const label =
    kind === "listing"
      ? value === "rent" || value === "sale"
        ? tListing(`listingModes.${value}`)
        : null
      : value === "onSite" || value === "hybrid" || value === "remote"
        ? tJobs(`workModes.${value}`)
        : null;

  if (!label) return null;

  return (
    <Badge variant="secondary" className="h-8 gap-1.5 rounded-full px-3 text-sm">
      {label}
      <button
        type="button"
        aria-label={t("removeFilter", { filter: label })}
        className="rounded-full p-0.5 hover:bg-foreground/10"
        onClick={() => void setValue(null)}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </Badge>
  );
}
