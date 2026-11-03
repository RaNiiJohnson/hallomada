"use client";

import { Button } from "@/components/ui/button";
import { formatDateLong } from "@/lib/date";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Loader2, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useIsFeatured } from "./featured-badge";

type Resource =
  | { type: "listing"; id: Id<"RealestateListing"> }
  | { type: "job"; id: Id<"JobOffer"> };

/** Owner action: feature a published listing or job offer, or stop featuring it. */
export function FeatureToggle({
  resource,
  featuredUntil,
  status,
}: {
  resource: Resource;
  featuredUntil: number | undefined;
  status?: string;
}) {
  const t = useTranslations("common.featured");
  const locale = useLocale();
  const feature = useMutation(api.featured.feature);
  const unfeature = useMutation(api.featured.unfeature);
  const [pending, setPending] = useState(false);
  const featured = useIsFeatured(featuredUntil, status);

  if (status !== undefined && status !== "active") return null;

  const run = async () => {
    setPending(true);
    try {
      if (featured) {
        await unfeature({ resource });
        toast.success(t("removed"));
      } else {
        const result = await feature({ resource });
        const until = formatDateLong(result.featuredUntil, locale);
        toast.success(
          result.replacedTitle
            ? t("movedFrom", { title: result.replacedTitle, date: until })
            : t("added", { date: until }),
        );
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={featured ? "secondary" : "outline"}
      disabled={pending}
      title={
        featured && featuredUntil
          ? t("until", { date: formatDateLong(featuredUntil, locale) })
          : t(`hint.${resource.type}`)
      }
      onClick={() => void run()}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Star className={featured ? "size-4 fill-amber-400 text-amber-500" : "size-4"} />
      )}
      {featured ? t("stop") : t("start")}
    </Button>
  );
}
