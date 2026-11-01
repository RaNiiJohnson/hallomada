"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import imageCompression from "browser-image-compression";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getConvexErrorCode } from "@/lib/convex-error";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useTypedR2Upload } from "@/hooks/use-r2-typed-upload";
import type { ListingListDetails } from "@/lib/convexTypes";
import { api } from "@convex/_generated/api";
import { ListingFormFields } from "./listing-form/listing-form-fields";
import {
  createListingFormSchema,
  listingFormDefaults,
  parseLocalCalendarDate,
  type ListingFormValues,
} from "./listing-form/listing-form-schema";
import {
  ListingPhotosField,
  MAX_LISTING_PHOTO_MB,
  MAX_LISTING_PHOTOS,
} from "./listing-form/listing-photos-field";

export {
  listingModeValues,
  listingTypeValues,
} from "./listing-form/listing-form-schema";

const missingImagePreview =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect width='100%25' height='100%25' fill='%23e5e7eb'/%3E%3C/svg%3E";

interface ListingFormProps {
  listing?: ListingListDetails;
  onSuccess?: () => void;
}

export function ListingForm({ listing, onSuccess }: ListingFormProps) {
  const t = useTranslations("listing");
  const tCommon = useTranslations("common");
  const isEditing = listing !== undefined;

  const { upload: uploadListingImages } = useTypedR2Upload(
    api.integrations.r2.generateListingUploadUrl,
    api.integrations.r2.syncMetadata,
    { accept: "image/*" },
  );
  const createListing = useMutation(api.listings.mutations.createListing);
  const updateListing = useMutation(api.listings.mutations.updateListing);
  const privateLocation = useQuery(
    api.listings.queries.getListingLocationForEdit,
    listing ? { id: listing._id } : "skip",
  );

  const schema = useMemo(
    () => createListingFormSchema((key) => t(key as Parameters<typeof t>[0])),
    [t],
  );
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: listingFormDefaults(listing),
  });

  const initialImageEntries = useMemo(
    () =>
      (listing?.images ?? []).map((image, index) => {
        const id = `existing-image-${index}`;
        return {
          id,
          image,
          file: {
            id,
            name: `${t("form.labels.existingPhoto")} ${index + 1}`,
            size: 0,
            type: "image/jpeg",
            url: image.url || image.secureUrl || missingImagePreview,
          },
        };
      }),
    [listing, t],
  );
  const existingImagesByFileId = useMemo(
    () => new Map(initialImageEntries.map(({ id, image }) => [id, image])),
    [initialImageEntries],
  );

  const [uploadState, uploadActions] = useFileUpload({
    accept: "image/png,image/jpeg,image/jpg,image/webp",
    initialFiles: initialImageEntries.map(({ file }) => file),
    maxFiles: MAX_LISTING_PHOTOS,
    maxSize: MAX_LISTING_PHOTO_MB * 1024 * 1024,
    multiple: true,
  });
  const { files } = uploadState;

  useEffect(() => {
    if (!privateLocation) return;
    const location = privateLocation.location ?? undefined;
    form.setValue("location", location);
    form.setValue("showMap", Boolean(location));
  }, [form, privateLocation]);

  async function onSubmit(data: ListingFormValues) {
    const requiresImage = !isEditing || (listing?.images.length ?? 0) > 0;
    if (requiresImage && files.length === 0) {
      toast.error(t("form.messages.imagesRequired"));
      return;
    }

    try {
      const images = await Promise.all(
        files.map(async (file) => {
          if (file.file instanceof File) {
            const compressed = await imageCompression(file.file, {
              maxSizeMB: 0.5,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            });
            const storageId = await uploadListingImages(compressed);
            if (!storageId) throw new Error("Image upload failed");
            return { storageId };
          }

          const existing = existingImagesByFileId.get(file.id);
          if (!existing) throw new Error("Existing image metadata not found");

          // Never persist a temporary signed R2 URL. R2 images are identified
          // by their stable storageId; legacy Cloudinary images keep metadata.
          if (existing.storageId) return { storageId: existing.storageId };
          return {
            publicId: existing.publicId,
            secureUrl: existing.secureUrl || existing.url,
          };
        }),
      );

      const isRental = data.listingMode === "rent";
      const values = {
        title: data.title,
        propertyType: data.propertyType,
        listingMode: data.listingMode,
        city: data.city,
        neighborhood: data.neighborhood || undefined,
        price: Number(data.price),
        area: Number(data.area),
        bedrooms: Number(data.bedrooms),
        bathrooms: Number(data.bathrooms),
        floor: Number(data.floor),
        pets: data.pets,
        description: data.description,
        extras: data.extras ?? [],
        images,
      };
      const contact = {
        email: data.contactEmail.trim() || undefined,
        phone: data.contactPhone.trim() || undefined,
      };
      const availableFrom = data.availableFrom
        ? parseLocalCalendarDate(data.availableFrom).getTime()
        : undefined;
      const charges = isRental && data.charges ? Number(data.charges) : undefined;
      const deposit = isRental && data.deposit ? Number(data.deposit) : undefined;
      const location = data.showMap ? data.location : undefined;

      if (listing) {
        await updateListing({
          listingId: listing._id,
          contact,
          patch: {
            ...values,
            location: location ?? null,
            charges: charges ?? null,
            deposit: deposit ?? null,
            availableFrom: availableFrom ?? null,
          },
        });
      } else {
        await createListing({
          ...values,
          contact,
          location,
          charges,
          deposit,
          availableFrom,
        });
      }

      toast.success(
        t(isEditing ? "form.messages.updateSuccess" : "form.messages.success"),
      );
      form.reset();
      uploadActions.clearFiles();
      onSuccess?.();
    } catch (error) {
      toast.error(
        getConvexErrorCode(error) === "LIMIT_REACHED"
          ? tCommon("limitReached")
          : t(isEditing ? "form.messages.updateError" : "form.messages.error"),
      );
    }
  }

  return (
    <form
      id="listing-form"
      className="space-y-6"
      onSubmit={form.handleSubmit(onSubmit)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
          e.preventDefault();
        }
      }}
    >
      <ListingFormFields form={form} photos={<ListingPhotosField state={uploadState} actions={uploadActions} />} />
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting
          ? t(isEditing ? "form.actions.saving" : "form.actions.publishing")
          : t(isEditing ? "form.actions.save" : "form.actions.publish")}
      </Button>
    </form>
  );
}
