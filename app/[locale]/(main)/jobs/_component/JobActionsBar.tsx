"use client";

import { useConvexAuth } from "convex/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { CreateAlertButton } from "@/components/alerts/create-alert-button";
import { ExtraFilterChip } from "@/components/alerts/extra-filter-chip";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function JobActionsBar() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const t = useTranslations("jobs");

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 my-1">
      <div className="flex-1">
        <ExtraFilterChip kind="job" />
      </div>
      <CreateAlertButton kind="job" />
      {isAuthenticated && !isLoading && (
      <Button asChild className="flex items-center gap-2">
        <Link href="/jobs/new">
          <Plus className="h-4 w-4" />
          <span>{t("publish")}</span>
        </Link>
      </Button>
      )}
    </div>
  );
}
