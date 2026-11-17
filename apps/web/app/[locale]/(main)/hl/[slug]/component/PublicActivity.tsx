"use client";

import { Link } from "@/i18n/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";

/** Public profile content deliberately consists only of active resource links. */
export function PublicActivity({ userId }: { userId: string }) {
  const t = useTranslations("profile");
  const activity = useQuery(api.me.queries.getPublicActivity, { userId });

  if (activity === undefined) {
    return (
      <section className="bg-card p-6 lg:rounded-lg" aria-hidden="true">
        <Skeleton className="mb-5 h-6 w-40" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-4/5 rounded-lg" />
        </div>
      </section>
    );
  }

  if (activity.length === 0) return null;

  return (
    <section className="bg-card p-6 lg:rounded-lg">
      <h2 className="mb-4 text-xl font-semibold">{t("activeContent")}</h2>
      <div className="space-y-2">
        {activity.map((item) => (
          <Link
            key={`${item.kind}-${item.href}`}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <FileText className="size-4 text-primary" />
            <span className="truncate font-medium">{item.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
