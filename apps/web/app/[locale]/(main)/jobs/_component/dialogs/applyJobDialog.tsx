"use client";

import { ApplicationQuotaNotice } from "@/components/application-quota-notice";
import { CvPreviewDialog } from "@/components/cv-preview-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import {
  isQuotaReached,
  useApplicationQuota,
} from "@/hooks/use-application-quota";
import { formatBytes, useFileUpload } from "@/hooks/use-file-upload";
import { useTypedR2Upload } from "@/hooks/use-r2-typed-upload";
import { JobOfferDetails } from "@/lib/convexTypes";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { useAction } from "convex/react";
import {
  AlertCircleIcon,
  EyeIcon,
  Loader2,
  PaperclipIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function ApplyJobDialog({
  jobOffer,
  children,
}: {
  jobOffer: JobOfferDetails;
  children: React.ReactNode;
}) {
  const user = useQuery(api.auth.auth.getCurrentUser);
  const quotaReached = isQuotaReached(useApplicationQuota());
  const applyToJob = useAction(api.jobs.actions.applyToJob);

  const { upload: uploadCv } = useTypedR2Upload(
    api.integrations.r2.generateApplicationCvUploadUrl,
    api.integrations.r2.syncMetadata,
    { accept: "application/pdf" },
  );
  const cvUrl = useQuery(api.integrations.r2.getCvUrl);
  const t = useTranslations("jobs.dialogs.apply");
  const locale = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [isPending, startTransition] = useTransition();

  const maxSize = 5 * 1024 * 1024; // 5MB max

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "application/pdf",
    maxSize,
    multiple: false,
  });

  const file = files[0];
  const hasProfileCv = !!user?.cv;

  async function handleApply() {
    if (!file && !hasProfileCv) {
      toast.error(t("errors.noCvProvided"));
      return;
    }

    startTransition(async () => {
      try {
        let applicationCvKey: string | undefined;

        // If user uploaded a new file, we upload it
        if (file && file.file instanceof File) {
          const uploadedStorageId = await uploadCv(file.file);
          if (!uploadedStorageId) {
            throw new Error(t("errors.uploadError"));
          }
          applicationCvKey = uploadedStorageId;
        }

        if (!applicationCvKey && !user?.cv) {
          throw new Error(t("errors.cvNotFound"));
        }

        await applyToJob({
          jobId: jobOffer._id,
          applicationCvKey,
          coverLetter: coverLetter.trim() || undefined,
          locale: locale as Locale,
        });

        toast.success(t("success.applied"));
        setIsOpen(false);
      } catch {
        toast.error(t("errors.applyError"));
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md overflow-hidden">
        <DialogHeader>
          <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">
            {t("application")}
          </div>
          <DialogTitle>
            <span className="line-clamp-1 text-xl">{jobOffer.title}</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground line-clamp-1">
            <span className="line-clamp-1 text-muted-foreground ">
              {jobOffer.company}
            </span>
          </DialogDescription>
        </DialogHeader>

        <ApplicationQuotaNotice />

        <div className="space-y-6 py-2">
          {/* Section CV */}
          <div className="space-y-3">
            <label className="text-sm font-semibold uppercase tracking-wider">
              {t("cvLabel")}{" "}
              <span className="text-muted-foreground font-normal normal-case">
                {t("cvHint")}
              </span>
            </label>

            {!hasProfileCv && !file && (
              <div className="flex gap-2 items-start text-sm text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-500 p-3 rounded-lg border border-amber-200 dark:border-amber-500/20">
                <AlertCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{t("noProfileCv")}</p>
              </div>
            )}

            {hasProfileCv && !file && (
              <div className="flex items-center justify-between gap-2 text-sm text-green-700 bg-green-50 dark:bg-green-500/10 dark:text-green-500 p-3 rounded-lg border border-green-200 dark:border-green-500/20">
                <div className="flex items-center gap-2">
                  <PaperclipIcon className="w-5 h-5 shrink-0" />
                  <p>{t("profileCvUsed")}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-green-700 hover:text-green-800 hover:bg-green-200/50 dark:text-green-500 dark:hover:text-green-400 dark:hover:bg-green-500/20 shrink-0 h-8 px-2"
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={!cvUrl}
                >
                  <EyeIcon className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">
                    {t.has("viewCv") ? t("viewCv") : "Voir"}
                  </span>
                </Button>
              </div>
            )}

            {!hasProfileCv || (hasProfileCv && !file) ? (
              <div
                className="flex flex-col items-center justify-center min-h-32 rounded-xl border border-input border-dashed p-4 transition-colors hover:bg-accent/50 cursor-pointer data-[dragging=true]:bg-accent/50"
                data-dragging={isDragging || undefined}
                onClick={openFileDialog}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input {...getInputProps()} className="sr-only" />
                <UploadIcon className="w-5 h-5 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">
                  {t("dropHere")}{" "}
                  <span className="text-primary underline">{t("browse")}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("maxSize")}
                </p>
              </div>
            ) : null}

            {file && (
              <div className="rounded-xl border px-4 py-3 bg-card space-y-2">
                <p className="text-xs text-muted-foreground">
                  {t("applicationCvUsed")}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    <PaperclipIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-medium truncate"
                        title={file.file.name}
                      >
                        {file.file.name.length > 30
                          ? `${file.file.name.slice(0, 20)}...${file.file.name.slice(-8)}`
                          : file.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.file.size)}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    aria-label="Remove file"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => removeFile(file.id)}
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {errors.length > 0 && (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <AlertCircleIcon className="w-3 h-3 shrink-0" />
                <span>{errors[0]}</span>
              </div>
            )}
          </div>

          {/* Section Motivation */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold uppercase tracking-wider">
                {t("coverLetter")}
              </label>
              <span className="text-xs text-muted-foreground">
                {t("optional")}
              </span>
            </div>
            <Textarea
              placeholder={t("coverLetterPlaceholder")}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleApply}
            disabled={isPending || quotaReached || (!file && !hasProfileCv)}
            className="gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>

      <CvPreviewDialog
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        cvUrl={cvUrl}
      />
    </Dialog>
  );
}
