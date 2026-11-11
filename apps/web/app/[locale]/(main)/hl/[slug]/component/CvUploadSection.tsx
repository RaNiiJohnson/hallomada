"use client";

import { CvPreviewDialog } from "@/components/cv-preview-dialog";
import { Button } from "@/components/ui/button";
import { formatBytes, useFileUpload } from "@/hooks/use-file-upload";
import { useTypedR2Upload } from "@/hooks/use-r2-typed-upload";
import { api } from "@convex/_generated/api";
import { UserType } from "@convex/betterAuth/users";
import { useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  EyeIcon,
  FileTextIcon,
  Loader2,
  PaperclipIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface CvUploadSectionProps {
  user: UserType;
}

export function CvUploadSection({ user }: CvUploadSectionProps) {
  const t = useTranslations("profile");

  const { upload: uploadCv } = useTypedR2Upload(
    api.integrations.r2.generateCvUploadUrl,
    api.integrations.r2.syncMetadata,
    { accept: "application/pdf" },
  );

  const uploadCvAndDeleteOld = useMutation(
    api.integrations.r2.uploadCvAndDeleteOld,
  );
  const deleteCv = useMutation(api.integrations.r2.deleteCv);
  const cvUrl = useQuery(api.integrations.r2.getCvUrl);

  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const maxSize = 5 * 1024 * 1024; // 5MB

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
      clearFiles,
    },
  ] = useFileUpload({
    accept: "application/pdf",
    maxSize,
    multiple: false,
  });

  const file = files[0];
  const hasProfileCv = user.hasCv === true;

  async function handleUploadCv() {
    if (!file || !(file.file instanceof File)) return;

    startTransition(async () => {
      try {
        // Upload to R2
        const newCvKey = await uploadCv(file.file as File);
        if (!newCvKey) {
          throw new Error("Upload failed");
        }

        // Save the new key and delete old one from R2
        await uploadCvAndDeleteOld({ newCvKey });

        clearFiles();
        toast.success(t("cv.uploadSuccess"));
      } catch {
        toast.error(t("cv.uploadError"));
      }
    });
  }

  async function handleDeleteCv() {
    setIsDeleting(true);
    try {
      await deleteCv();
      toast.success(t("cv.deleteSuccess"));
    } catch {
      toast.error(t("cv.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="bg-card lg:rounded-lg p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-4">{t("cv.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("cv.description")}</p>
      </div>

      {/* Current CV status */}
      {hasProfileCv && !file && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-green-200 dark:border-green-500/20 bg-green-50 dark:bg-green-500/10 p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg shrink-0">
              <CheckCircle2Icon className="w-5 h-5 text-green-600 dark:text-green-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-green-700 dark:text-green-500">
                {t("cv.currentCv")}
              </p>
              <p className="text-xs text-green-600/70 dark:text-green-500/70">
                {t("cv.currentCvHint")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-green-700 hover:text-green-800 hover:bg-green-200/50 dark:text-green-500 dark:hover:text-green-400 dark:hover:bg-green-500/20 shrink-0"
              onClick={() => setIsPreviewOpen(true)}
              disabled={isDeleting || cvUrl === undefined}
            >
              <EyeIcon className="w-4 h-4" />
              {t.has("cv.view") ? t("cv.view") : "Voir"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={handleDeleteCv}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2Icon className="w-4 h-4" />
              )}
              {t("cv.delete")}
            </Button>
          </div>
        </div>
      )}

      {/* No CV warning */}
      {!hasProfileCv && !file && (
        <div className="flex gap-2 items-start text-sm text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-500 p-3 rounded-lg border border-amber-200 dark:border-amber-500/20">
          <AlertCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{t("cv.noCv")}</p>
        </div>
      )}

      {/* Drop zone */}
      {!file && (
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
          <div className="p-3 bg-secondary rounded-full mb-3">
            <UploadIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">
            {t("cv.dropHere")}{" "}
            <span className="text-primary underline">{t("cv.browse")}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("cv.maxSize")}
          </p>
        </div>
      )}

      {/* Selected file */}
      {file && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border px-4 py-3 bg-card">
            <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <FileTextIcon className="w-4 h-4 text-primary" />
              </div>
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
              disabled={isPending}
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>

          {hasProfileCv && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <PaperclipIcon className="w-3 h-3" />
              {t("cv.willReplace")}
            </p>
          )}

          <Button
            onClick={handleUploadCv}
            disabled={isPending}
            className="w-full gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? t("cv.uploading") : t("cv.upload")}
          </Button>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="flex items-center gap-1 text-destructive text-xs">
          <AlertCircleIcon className="w-3 h-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}

      {/* CV Preview Dialog */}
      <CvPreviewDialog
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        cvUrl={cvUrl}
      />
    </section>
  );
}
