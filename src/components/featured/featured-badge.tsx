"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/** True while a publication's "En vedette" period is running. */
export function useIsFeatured(
  featuredUntil: number | undefined,
  status?: string,
) {
  const [now] = useState(() => Date.now());
  return (
    featuredUntil !== undefined &&
    featuredUntil > now &&
    (status === undefined || status === "active")
  );
}

export function FeaturedBadge({
  featuredUntil,
  status,
  className,
}: {
  featuredUntil: number | undefined;
  status?: string;
  className?: string;
}) {
  const t = useTranslations("common.featured");
  const featured = useIsFeatured(featuredUntil, status);
  if (!featured) return null;
  return (
    <Badge
      className={cn(
        "gap-1 bg-amber-400 text-amber-950 shadow-sm hover:bg-amber-400",
        className,
      )}
    >
      <Star className="h-3 w-3 fill-current" />
      {t("badge")}
    </Badge>
  );
}
