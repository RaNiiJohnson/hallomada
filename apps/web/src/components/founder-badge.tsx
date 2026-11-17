"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { Award } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * "Membre fondateur" badge shown next to a member's name on their profile,
 * listings and job offers. Hovering (or focusing) it explains what it means.
 * `compact` shows the icon only; the default shows the label and number.
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
  const founder = useQuery(api.founders.getFounder, userId ? { userId } : "skip");

  if (!founder) return null;

  const label =
    founder.number !== null ? t("labelNumber", { number: founder.number }) : t("label");

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={cn(
              "inline-flex shrink-0 cursor-help items-center gap-1 rounded-full bg-amber-500/15 align-middle font-medium text-amber-700 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 dark:text-amber-400",
              compact ? "p-0.5" : "px-2 py-0.5 text-xs",
              className,
            )}
          >
            <Award className="h-3.5 w-3.5" aria-hidden />
            {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 text-center">
          <p className="font-semibold">{label}</p>
          <p className="mt-0.5">{t("tooltip")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
