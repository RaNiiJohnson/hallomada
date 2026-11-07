"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthRequiredAction } from "@/hooks/use-auth-required-action";
import { Link } from "@/i18n/navigation";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { MAX_RENTAL_MESSAGE } from "@convex/rentalFiles/values";
import { useQuery } from "convex-helpers/react/cache";
import { useAction, useConvexAuth } from "convex/react";
import { CheckCircle2, FolderUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

/** "Send my dossier" on a rental listing, for visitors. */
export function SendRentalFileButton({
  listingId,
}: {
  listingId: Id<"RealestateListing">;
}) {
  const t = useTranslations("rentalFile.send");
  const { isAuthenticated, isLoading } = useConvexAuth();
  const requireAuth = useAuthRequiredAction();
  const mine = useQuery(api.rentalFiles.queries.getMine, isAuthenticated ? {} : "skip");
  const alreadySent = useQuery(
    api.rentalFiles.queries.hasSentToListing,
    isAuthenticated ? { listingId } : "skip",
  );
  const send = useAction(api.rentalFiles.actions.sendRentalFile);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        size="lg"
        className="flex w-full items-center gap-2"
        disabled={isLoading}
        onClick={requireAuth}
      >
        <FolderUp className="h-4 w-4" />
        {t("button")}
      </Button>
    );
  }

  if (alreadySent) {
    return (
      <Button variant="outline" size="lg" className="flex w-full items-center gap-2" disabled>
        <CheckCircle2 className="h-4 w-4" />
        {t("sent")}
      </Button>
    );
  }

  const documentCount = mine?.documents.length ?? 0;

  const submit = async () => {
    setSending(true);
    try {
      await send({ listingId, message: message.trim() || undefined });
      toast.success(t("success"));
      setOpen(false);
      setMessage("");
    } catch {
      toast.error(t("error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="flex w-full items-center gap-2"
          disabled={mine === undefined || alreadySent === undefined}
        >
          <FolderUp className="h-4 w-4" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {documentCount === 0 ? (
          <div className="space-y-4">
            <p className="text-sm">{t("empty")}</p>
            <Button asChild className="w-full">
              <Link href="/me?tab=dossier">{t("prepare")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t("summary", { count: documentCount })}{" "}
              <Link href="/me?tab=dossier" className="text-primary hover:underline">
                {t("edit")}
              </Link>
            </p>
            <div className="space-y-2">
              <Label htmlFor="rental-message">{t("message")}</Label>
              <Textarea
                id="rental-message"
                value={message}
                maxLength={MAX_RENTAL_MESSAGE}
                rows={4}
                placeholder={t("messagePlaceholder")}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("privacy")}</p>
            <DialogFooter>
              <Button onClick={() => void submit()} disabled={sending}>
                {sending ? t("sending") : t("submit")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
