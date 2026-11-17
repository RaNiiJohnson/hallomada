"use client";

import { Button } from "@/components/ui/button";
import { formatDateLong } from "@/lib/date";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { BUMP_COOLDOWN_MS } from "@convex/bumpValues";
import { useMutation } from "convex/react";
import { ArrowUpToLine, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type Resource =
  | { type: "listing"; id: Id<"RealestateListing"> }
  | { type: "job"; id: Id<"JobOffer"> };

/** Owner action: move a published listing or job offer back to the top. */
export function BumpButton({
  resource,
  bumpedAt,
  status,
}: {
  resource: Resource;
  bumpedAt: number | undefined;
  status?: string;
}) {
  const t = useTranslations("common.bump");
  const locale = useLocale();
  const bump = useMutation(api.bump.bump);
  const [pending, setPending] = useState(false);
  const [now] = useState(() => Date.now());

  if (status !== undefined && status !== "active") return null;

  const nextBumpAt = bumpedAt !== undefined ? bumpedAt + BUMP_COOLDOWN_MS : 0;
  const waiting = nextBumpAt > now;

  const run = async () => {
    setPending(true);
    try {
      const result = await bump({ resource });
      toast.success(t("done", { date: formatDateLong(result.nextBumpAt, locale) }));
    } catch {
      toast.error(t("error"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending || waiting}
      title={
        waiting
          ? t("nextOn", { date: formatDateLong(nextBumpAt, locale) })
          : t(`hint.${resource.type}`)
      }
      onClick={() => void run()}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpToLine className="size-4" />}
      {waiting ? t("waiting", { date: formatDateLong(nextBumpAt, locale) }) : t("start")}
    </Button>
  );
}
