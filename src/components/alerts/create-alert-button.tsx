"use client";

import { Button } from "@/components/ui/button";
import { useAuthRequiredAction } from "@/hooks/use-auth-required-action";
import { useConvexAuth } from "convex/react";
import { BellPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { AlertFormDialog, type AlertKind } from "./alert-form-dialog";

/**
 * "Create an alert" button for the listing and job pages. Prefills the alert
 * with the filters currently applied; sends visitors to the login page first.
 */
export function CreateAlertButton({ kind }: { kind: AlertKind }) {
  const t = useTranslations("alerts");
  const { isAuthenticated, isLoading } = useConvexAuth();
  const requireAuth = useAuthRequiredAction();
  const [filters] = useQueryStates({
    type: parseAsString.withDefault("all"),
    maxPrice: parseAsInteger.withDefault(0),
  });

  const button = (
    <Button variant="outline" className="flex items-center gap-2" disabled={isLoading}>
      <BellPlus className="h-4 w-4" />
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
        <BellPlus className="h-4 w-4" />
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
              propertyType: filters.type,
              maxPrice: filters.maxPrice || undefined,
            }
          : { jobType: filters.type }
      }
    />
  );
}
