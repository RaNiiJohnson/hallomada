"use client";

import { AlertCircleIcon, ImageIcon, UploadIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type {
  FileUploadActions,
  FileUploadState,
} from "@/hooks/use-file-upload";

export const MAX_LISTING_PHOTOS = 10;
export const MAX_LISTING_PHOTO_MB = 20;

type Props = {
  state: FileUploadState;
  actions: FileUploadActions;
};

export function ListingPhotosField({ state, actions }: Props) {
  const t = useTranslations("listing");
  const { files, isDragging, errors } = state;
  const hint = t("form.labels.photosDesc", {
    maxFiles: MAX_LISTING_PHOTOS,
    maxSize: MAX_LISTING_PHOTO_MB,
  });

  return (
    <Field>
      <FieldLabel>{t("form.labels.photos")}</FieldLabel>
      <FieldDescription>{hint}</FieldDescription>
      <div
        className="relative flex min-h-52 flex-col items-center not-data-files:justify-center overflow-hidden rounded-xl border border-input border-dashed p-4 transition-colors has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
        data-dragging={isDragging || undefined}
        data-files={files.length > 0 || undefined}
        onDragEnter={actions.handleDragEnter}
        onDragLeave={actions.handleDragLeave}
        onDragOver={actions.handleDragOver}
        onDrop={actions.handleDrop}
      >
        <input
          {...actions.getInputProps()}
          aria-label={t("form.aria.uploadImages")}
          className="sr-only"
        />
        {files.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate font-medium text-sm">
                {t("form.labels.photosAdded", { count: files.length })}
              </h3>
              <Button
                type="button"
                disabled={files.length >= MAX_LISTING_PHOTOS}
                onClick={actions.openFileDialog}
                size="sm"
                variant="outline"
              >
                <UploadIcon aria-hidden="true" className="-ms-0.5 size-3.5 opacity-60" />
                {t("form.actions.addPhoto")}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {files.map((file) => (
                <div
                  className="relative aspect-square rounded-md bg-accent overflow-hidden"
                  key={file.id}
                >
                  <Image
                    alt={file.file.name}
                    className="size-full object-cover"
                    src={file.preview || ""}
                    width={300}
                    height={300}
                    unoptimized
                  />
                  <Button
                    type="button"
                    aria-label={t("form.aria.removeImage", { name: file.file.name })}
                    className="absolute right-2 top-2 z-10 size-7 rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
                    onClick={() => actions.removeFile(file.id)}
                    size="icon"
                    variant="secondary"
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
            <div
              aria-hidden="true"
              className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
            >
              <ImageIcon className="size-4 opacity-60" />
            </div>
            <p className="mb-1.5 font-medium text-sm">
              {t("form.placeholders.photosDrop")}
            </p>
            <p className="text-muted-foreground text-xs">{hint}</p>
            <Button
              type="button"
              className="mt-4"
              onClick={actions.openFileDialog}
              variant="outline"
            >
              <UploadIcon aria-hidden="true" className="-ms-1 opacity-60" />
              {t("form.actions.addPhoto")}
            </Button>
          </div>
        )}
      </div>
      {errors.length > 0 && (
        <div className="flex items-center gap-1 text-destructive text-xs" role="alert">
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}
    </Field>
  );
}
