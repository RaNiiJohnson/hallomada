"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useTypedR2Upload } from "@/hooks/use-r2-typed-upload";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { Camera, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type ImageType = "profile" | "cover";

interface ImageUploadModalProps {
  imageType: ImageType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImageUrl?: string | null;
  onSuccess?: () => void;
}

export function ImageUploadModal({
  imageType,
  open,
  onOpenChange,
  currentImageUrl,
  onSuccess,
}: ImageUploadModalProps) {
  const t = useTranslations("profile.upload");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const replaceProfileImage = useMutation(
    api.integrations.r2.replaceProfileImage,
  );
  const { upload: uploadImage } = useTypedR2Upload(
    imageType === "profile"
      ? api.integrations.r2.generatePdpUploadUrl
      : api.integrations.r2.generatePdcUploadUrl,
    api.integrations.r2.syncMetadata,
    { accept: "image/jpeg,image/png,image/webp,image/avif" },
  );

  const [
    { files, isDragging, errors },
    {
      removeFile,
      openFileDialog,
      getInputProps,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      clearFiles,
    },
  ] = useFileUpload({
    accept: "image/jpeg,image/png,image/webp,image/avif",
    maxSize: 5 * 1024 * 1024, // 5MB max
    maxFiles: 1,
  });

  const selectedFile = files[0]?.file instanceof File ? files[0].file : null;
  const previewUrl = files[0]?.preview || null;

  const handleUpload = async () => {
    if (!selectedFile || isPending) return;
    setIsPending(true);
    try {
      const key = await uploadImage(selectedFile);
      await replaceProfileImage({ key, imageType });
      toast.success(t("toast.success"));
      clearFiles();
      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    } catch (error) {
      toast.error(t("toast.uploadError"), {
        description: error instanceof Error ? error.message : t("toast.error"),
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleClose = () => {
    if (!isPending) {
      clearFiles();
      onOpenChange(false);
    }
  };

  const isProfileImage = imageType === "profile";
  const title = isProfileImage ? t("profileTitle") : t("coverTitle");
  const description = isProfileImage ? t("profileDesc") : t("coverDesc");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="size-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drop Zone */}
          <div
            role="button"
            tabIndex={0}
            aria-label={previewUrl ? t("changeImage") : t("uploadImage")}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer",
              isProfileImage
                ? "aspect-square mx-auto max-w-[200px]"
                : "aspect-video",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50",
              previewUrl && "border-none",
            )}
            onClick={openFileDialog}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                openFileDialog();
              }
            }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <>
                <Image
                  src={previewUrl}
                  alt={t("preview")}
                  className={cn(
                    "w-full h-full object-cover",
                    isProfileImage ? "rounded-full" : "rounded-xl",
                  )}
                  width={100}
                  height={100}
                />
                {/* Overlay on hover */}
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity",
                    isProfileImage ? "rounded-full" : "rounded-xl",
                  )}
                >
                  <div className="text-center text-white">
                    <Upload className="mx-auto size-8 mb-2" />
                    <span className="text-sm font-medium">{t("change")}</span>
                  </div>
                </div>
                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(files[0]?.id);
                  }}
                  className="absolute -top-2 -right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-lg"
                  aria-label={t("removeImage")}
                >
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <ImageIcon className="size-8 text-primary" />
                </div>
                <p className="text-sm font-medium mb-1">{t("dragDrop")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("clickToSelect")}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("maxSize")}
                </p>
              </div>
            )}

            <input {...getInputProps()} className="sr-only" />
          </div>

          {/* Current image preview (if no new image selected) */}
          {!previewUrl && currentImageUrl && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {t("currentImage")}
              </p>
              <div
                className={cn(
                  "overflow-hidden mx-auto border",
                  isProfileImage
                    ? "rounded-full size-20"
                    : "rounded-lg max-w-[200px] aspect-video",
                )}
              >
                <Image
                  src={currentImageUrl}
                  alt={t("currentImageAlt")}
                  className="w-full h-full object-cover"
                  width={100}
                  height={300}
                />
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {errors.map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isPending}
            className="min-w-[100px]"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("sending")}
              </>
            ) : (
              <>
                <Upload className="mr-2 size-4" />
                {t("save")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
