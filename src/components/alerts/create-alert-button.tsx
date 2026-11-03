"use client";

import { Button } from "@/components/ui/button";
import { useAuthRequiredAction } from "@/hooks/use-auth-required-action";
import { useConvexAuth } from "convex/react";
import { BookmarkPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { AlertFormDialog, type AlertKind } from "./alert-form-dialog";

/**
 * "Save this search" button for the listing and job pages. Prefills the saved
 * search with the filters currently applied; sends visitors to log in first.
 */
export function CreateAlertButton({ kind }: { kind: AlertKind }) {
  const t = useTranslations("alerts");
  const { isAuthenticated, isLoading } = useConvexAuth();
  const requireAuth = useAuthRequiredAction();
  const [filters] = useQueryStates({
    search: parseAsString.withDefault(""),
    type: parseAsString.withDefault("all"),
    maxPrice: parseAsInteger.withDefault(0),
    mode: parseAsString.withDefault(""),
    workMode: parseAsString.withDefault(""),
  });

  const button = (
    <Button variant="outline" className="flex items-center gap-2" disabled={isLoading}>
      <BookmarkPlus className="h-4 w-4" />
      <span>{t("create")}</span>
    </Button>
  );

  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        className="flex items-center gap-2"
        disabled={isLoading}
        onClick={requireAuth}
      >
        <BookmarkPlus className="h-4 w-4" />
        <span>{t("create")}</span>
      </Button>
    );
  }

  return (
    <AlertFormDialog
      kind={kind}
      trigger={button}
      defaults={
        kind === "listing"
          ? {
              keywords: filters.search,
              propertyType: filters.type,
              listingMode: filters.mode,
              maxPrice: filters.maxPrice || undefined,
            }
          : {
              keywords: filters.search,
              jobType: filters.type,
              workMode: filters.workMode,
            }
      }
    />
  );
}
