"use client";

import { Button } from "@/components/ui/button";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Archive, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import type { PublicationStatus } from "@hallomada/shared/publication-lifecycle";

type ListingStatus = PublicationStatus;
type MutableListingStatus = Exclude<ListingStatus, "rejected">;

export function ListingLifecycleActions({
  listingId,
  status = "active",
}: {
  listingId: Id<"RealestateListing">;
  status?: ListingStatus;
}) {
  const setListingStatus = useMutation(api.listings.mutations.setListingStatus);
  const [pendingStatus, setPendingStatus] =
    useState<MutableListingStatus | null>(null);
  const t = useTranslations("listing.dialogs.lifecycle");

  async function changeStatus(nextStatus: MutableListingStatus) {
    setPendingStatus(nextStatus);
    try {
      await setListingStatus({ listingId, status: nextStatus });
      toast.success(t("success"));
    } catch {
      toast.error(t("error"));
    } finally {
      setPendingStatus(null);
    }
  }

  const isPending = pendingStatus !== null;
  const iconFor = (nextStatus: MutableListingStatus) =>
    pendingStatus === nextStatus ? <Loader2 className="size-4 animate-spin" /> : null;

  if (status === "archived") {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => changeStatus("pending")}
      >
        {iconFor("pending") ?? <RotateCcw className="size-4" />}
        {t("resubmit")}
      </Button>
    );
  }

  if (status === "pending" || status === "rejected") return null;

  if (status === "closed") {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => changeStatus("active")}
        >
          {iconFor("active") ?? <RotateCcw className="size-4" />}
          {t("reopen")}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => changeStatus("archived")}
        >
          {iconFor("archived") ?? <Archive className="size-4" />}
          {t("archive")}
        </Button>
      </>
    );
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={() => changeStatus("closed")}>
      {iconFor("closed") ?? <CheckCircle2 className="size-4" />}
      {t("close")}
    </Button>
  );
}
