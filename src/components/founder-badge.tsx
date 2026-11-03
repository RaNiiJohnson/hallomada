"use client";

import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { Award } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * "Membre fondateur" badge shown next to a member's name. Renders nothing
 * until the status is known, or when the member is not a founder.
 * `compact` shows the icon only (lists, comments, chat); the default shows the
 * label too (profile header).
 */
export function FounderBadge({
  userId,
  compact = false,
  className,
}: {
  userId: string | null | undefined;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("common.founderBadge");
  const isFounder = useQuery(
    api.founders.isFounder,
    userId ? { userId } : "skip",
  );

  if (!isFounder) return null;

  return (
    <span
      title={t("tooltip")}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 align-middle font-medium text-amber-700 dark:text-amber-400",
        compact ? "p-0.5" : "px-2 py-0.5 text-xs",
        className,
      )}
    >
      <Award className="h-3.5 w-3.5" aria-hidden />
      {compact ? (
        <span className="sr-only">{t("label")}</span>
      ) : (
        <span>{t("label")}</span>
      )}
    </span>
  );
}
