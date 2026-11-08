"use client";

import { Link } from "@/i18n/navigation";
import { useApplicationQuota } from "@/hooks/use-application-quota";
import { cn } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";

/**
 * "Il te reste 3 candidatures": shown next to the buttons that use one.
 * Hidden for unlimited (Premium) members and while loading.
 */
export function ApplicationQuotaNotice({ className }: { className?: string }) {
  const t = useTranslations("applicationQuota");
  const format = useFormatter();
  const usage = useApplicationQuota();

  if (!usage || usage.limit === null || usage.remaining === null) return null;

  const date =
    usage.resetsAt === null
      ? null
      : format.dateTime(usage.resetsAt, { dateStyle: "long" });

  if (usage.remaining === 0) {
    return (
      <div
        role="status"
        className={cn(
          "rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
          className,
        )}
      >
        <p className="font-medium">{t("reachedTitle", { limit: usage.limit })}</p>
        <p className="mt-1">
          {t("reachedText", { date: date ?? "" })}{" "}
          <Link href="/pricing" className="font-medium underline">
            {t("premiumLink")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <p
      role="status"
      className={cn(
        "text-xs",
        usage.remaining === 1
          ? "font-medium text-amber-700 dark:text-amber-400"
          : "text-muted-foreground",
        className,
      )}
    >
      {t("remaining", { count: usage.remaining })}
    </p>
  );
}
