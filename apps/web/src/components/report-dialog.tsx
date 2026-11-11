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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthRequiredAction } from "@/hooks/use-auth-required-action";
import { useRouter } from "@/i18n/navigation";
import { getAuthHref, getCurrentReturnTo } from "@/lib/auth-return-to";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex-helpers/react/cache";
import { useConvexAuth, useMutation } from "convex/react";
import { Flag, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

const REPORT_REASONS = [
  "spam",
  "fraud",
  "harassment",
  "hate",
  "dangerous",
  "misinformation",
  "other",
] as const;

type ReportReason = (typeof REPORT_REASONS)[number];

type ReportTarget =
  | { type: "post"; id: Id<"posts"> }
  | { type: "job"; id: Id<"JobOffer"> }
  | { type: "listing"; id: Id<"RealestateListing"> }
  | { type: "provider"; id: Id<"providers"> }
  | { type: "community"; id: Id<"communities"> };

type ReportDialogProps = {
  target: ReportTarget;
  variant?: "ghost" | "outline" | "secondary";
  size?: "sm" | "icon-sm";
  className?: string;
  showLabel?: boolean;
};

export function ReportDialog({
  target,
  variant = "ghost",
  size = "sm",
  className,
  showLabel = true,
}: ReportDialogProps) {
  const t = useTranslations("reports.dialog");
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.auth.auth.getCurrentUser);
  const requireAuthentication = useAuthRequiredAction();
  const router = useRouter();
  const createReport = useMutation(api.reports.create);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reported, setReported] = useState(false);
  const isAuthLoading = isAuthenticated && currentUser === undefined;
  const canReport = isAuthenticated && currentUser?.emailVerified === true;

  const requireEmailVerification = () => {
    router.push(
      getAuthHref("/verify-email", getCurrentReturnTo(window.location)),
    );
  };

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await createReport({
        target,
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      });
      setReported(true);
      setOpen(false);
      setReason("");
      setDetails("");
      toast.success(t("success"));
    } catch {
      toast.error(t("error"));
    } finally {
      setSubmitting(false);
    }
  };

  const trigger = (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={reported || isAuthLoading}
      className={cn("gap-2", className)}
      onClick={
        !isAuthenticated
          ? requireAuthentication
          : canReport
            ? undefined
            : requireEmailVerification
      }
      aria-label={reported ? t("reported") : t("trigger")}
    >
      <Flag className="size-4" />
      {showLabel ? <span>{reported ? t("reported") : t("trigger")}</span> : null}
    </Button>
  );

  if (!canReport) return trigger;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="report-reason">
              {t("reasonLabel")}
            </label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as ReportReason)}
            >
              <SelectTrigger id="report-reason" className="w-full">
                <SelectValue placeholder={t("reasonPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`reasons.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="report-details">
              {t("detailsLabel")}
            </label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={500}
              rows={4}
              placeholder={t("detailsPlaceholder")}
            />
            <p className="text-right text-xs text-muted-foreground">
              {details.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={!reason || submitting}
            className="gap-2"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
