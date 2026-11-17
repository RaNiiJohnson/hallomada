"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";

export function LegacyBookmarkRedirect({
  bookmarkId,
}: {
  bookmarkId: Id<"bookmarks">;
}) {
  const t = useTranslations("me.favorites");
  const router = useRouter();
  const resolveLegacyBookmark = useMutation(
    api.bookmarks.mutations.resolveLegacyBookmark,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void resolveLegacyBookmark({ bookmarkId })
      .then((snapshot) => {
        if (active) router.replace(snapshot.href);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [bookmarkId, resolveLegacyBookmark, router]);

  if (failed) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8">
        <p className="text-muted-foreground">{t("unavailable")}</p>
        <Button asChild variant="outline">
          <Link href="/me">{t("backToFavorites")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-8" aria-label={t("opening")}>
      <Skeleton className="h-6 w-44" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  );
}
