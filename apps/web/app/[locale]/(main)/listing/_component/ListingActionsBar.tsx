"use client";

import { useConvexAuth } from "convex/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function ListingActionsBar() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const t = useTranslations("listing");

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 my-1">
      <div className="flex-1" />
      {isAuthenticated && !isLoading && (
      <Button asChild className="flex items-center gap-2">
        <Link href="/listing/new">
          <Plus className="h-4 w-4" />
          <span>{t("cta.publish")}</span>
        </Link>
      </Button>
      )}
    </div>
  );
}
