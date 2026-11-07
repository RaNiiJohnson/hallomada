"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import imageCompression from "browser-image-compression";
import { useMutation } from "convex/react";
import {
  AlertCircleIcon,
  ImageIcon,
  PlusIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useMemo } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  type UseFormReturn,
} from "react-hook-form";
import { toast } from "sonner";

import {
  OptionalSection,
  SelectFormField,
  TextareaFormField,
  TextFormField,
} from "@/components/form-fields";
import { MarkdownHint } from "@/components/markdown-hint";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  useFileUpload,
  type FileUploadActions,
  type FileUploadState,
} from "@/hooks/use-file-upload";
import { getConvexErrorCode } from "@/lib/convex-error";
import { useTypedR2Upload } from "@/hooks/use-r2-typed-upload";
import {
  MAX_PROVIDER_PHOTOS,
  MAX_PROVIDER_SERVICES,
  providerCategoryValues,
  providerServiceModeValues,
} from "@/lib/providers";
import { api } from "@convex/_generated/api";
import {
  createProviderFormSchema,
  optionalProviderContactFields,
  providerFormDefaults,
  type ProviderFormValues,
} from "./provider-form-schema";
import type { ProviderPage } from "./types";

const MAX_PROVIDER_PHOTO_MB = 10;
const ACCEPTED_IMAGES = "image/png,image/jpeg,image/jpg,image/webp";

interface ProviderFormProps {
  provider?: ProviderPage;
  onSuccess?: (slug: string) => void;
}

export function ProviderForm({ provider, onSuccess }: ProviderFormProps) {
  const t = useTranslations("providers");
  const tCommon = useTranslations("common");
  const isEditing = provider !== undefined;

  const { upload } = useTypedR2Upload(
    api.integrations.r2.generateProviderUploadUrl,
    api.integrations.r2.syncMetadata,
    { accept: "image/*" },
  );
  const createProvider = useMutation(api.providers.mutations.createProvider);
  const updateProvider = useMutation(api.providers.mutations.updateProvider);

  const schema = useMemo(
    () => createProviderFormSchema((key) => t(key as Parameters<typeof t>[0])),
    [t],
  );
  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: providerFormDefaults(provider),
  });

  // Existing images keep their storageId (keyed by file id); only new files
  // are uploaded. Signed R2 URLs are never persisted.
  const existingStorageIds = useMemo(() => {
    const map = new Map<string, string>();
    if (provider?.logo) map.set("existing-logo", provider.logo.storageId);
    provider?.images.forEach((image, index) =>
      map.set(`existing-image-${index}`, image.storageId),
    );
    return map;
  }, [provider]);

  const [logoState, logoActions] = useFileUpload({
    accept: ACCEPTED_IMAGES,
    maxSize: MAX_PROVIDER_PHOTO_MB * 1024 * 1024,
    initialFiles:
      provider?.logo && provider.logoUrl
        ? [
            {
              id: "existing-logo",
              name: "logo",
              size: 0,
              type: "image/jpeg",
              url: provider.logoUrl,
            },
          ]
        : [],
  });
  const [photosState, photosActions] = useFileUpload({
    accept: ACCEPTED_IMAGES,
    maxFiles: MAX_PROVIDER_PHOTOS,
    maxSize: MAX_PROVIDER_PHOTO_MB * 1024 * 1024,
    multiple: true,
    initialFiles: (provider?.images ?? []).flatMap((image, index) =>
      image.url
        ? [
            {
              id: `existing-image-${index}`,
              name: `photo-${index + 1}`,
              size: 0,
              type: "image/jpeg",
              url: image.url,
            },
          ]
        : [],
    ),
  });

  async function toStoredImage(entry: { id: string; file: File | unknown }) {
    if (entry.file instanceof File) {
      const compressed = await imageCompression(entry.file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      const storageId = await upload(compressed);
      if (!storageId) throw new Error("Image upload failed");
      return { storageId };
    }
    const storageId = existingStorageIds.get(entry.id);
    if (!storageId) throw new Error("Existing image not found");
    return { storageId };
  }

  async function onSubmit(data: ProviderFormValues) {
    try {
      const logoEntry = logoState.files[0];
      const [logo, images] = await Promise.all([
        logoEntry ? toStoredImage(logoEntry) : undefined,
        Promise.all(photosState.files.map(toStoredImage)),
      ]);
      const optional = (value: string) => value.trim() || undefined;

      const values = {
        name: data.name,
        category: data.category,
        tagline: optional(data.tagline),
        city: data.city,
        serviceModes: data.serviceModes,
        description: data.description,
        services: data.services
          .filter((service) => service.name.trim())
          .map((service) => ({
            name: service.name.trim(),
            price: optional(service.price),
          })),
        logo,
        images,
        whatsapp: data.whatsapp,
        phone: optional(data.phone),
        email: optional(data.email),
        website: optional(data.website),
        facebook: optional(data.facebook),
        instagram: optional(data.instagram),
        tiktok: optional(data.tiktok),
      };

      let slug: string;
      if (provider) {
        await updateProvider({ providerId: provider._id, provider: values });
        slug = provider.slug;
      } else {
        slug = (await createProvider(values)).slug;
      }

      toast.success(
        t(isEditing ? "form.messages.updated" : "form.messages.created"),
      );
      onSuccess?.(slug);
    } catch (error) {
      toast.error(
        getConvexErrorCode(error) === "LIMIT_REACHED"
          ? tCommon("limitReached")
          : t("form.messages.error"),
      );
    }
  }

  return (
    <form
      className="space-y-8"
      onSubmit={form.handleSubmit(onSubmit)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
          e.preventDefault();
        }
      }}
    >
      <AboutFields form={form} />
      <ServicesFields form={form} />

      <FieldSet>
        <FieldLegend>{t("form.sections.images")}</FieldLegend>
        <FieldGroup>
          <ImagesField
            label={t("form.labels.logo")}
            state={logoState}
            actions={logoActions}
            single
          />
          <ImagesField
            label={t("form.labels.photos")}
            hint={t("form.labels.photosHint", {
              max: MAX_PROVIDER_PHOTOS,
              size: MAX_PROVIDER_PHOTO_MB,
            })}
            state={photosState}
            actions={photosActions}
            max={MAX_PROVIDER_PHOTOS}
          />
        </FieldGroup>
      </FieldSet>

      <ContactFields form={form} />

      <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting
          ? t(isEditing ? "form.actions.saving" : "form.actions.publishing")
          : t(isEditing ? "form.actions.save" : "form.actions.publish")}
      </Button>
    </form>
  );
}

type FieldsProps = { form: UseFormReturn<ProviderFormValues> };

function AboutFields({ form }: FieldsProps) {
  const t = useTranslations("providers");
  const { control } = form;

  return (
    <FieldSet>
      <FieldLegend>{t("form.sections.about")}</FieldLegend>
      <FieldGroup>
        <TextFormField
          control={control}
          name="name"
          label={t("form.labels.name")}
          placeholder={t("form.placeholders.name")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectFormField
            control={control}
            name="category"
            label={t("form.labels.category")}
            options={providerCategoryValues.map((value) => ({
              value,
              label: t(`categories.${value}`),
            }))}
          />
          <TextFormField
            control={control}
            name="city"
            label={t("form.labels.city")}
            placeholder={t("form.placeholders.city")}
          />
        </div>
        <TextFormField
          control={control}
          name="tagline"
          label={t("form.labels.tagline")}
          placeholder={t("form.placeholders.tagline")}
          optional
        />
        <Controller
          control={control}
          name="serviceModes"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t("form.labels.serviceModes")}</FieldLabel>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {providerServiceModeValues.map((mode) => {
                  const checked = field.value.includes(mode);
                  return (
                    <label
                      key={mode}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          field.onChange(
                            next
                              ? [...field.value, mode]
                              : field.value.filter((m) => m !== mode),
                          )
                        }
                      />
                      {t(`serviceModes.${mode}`)}
                    </label>
                  );
                })}
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <TextareaFormField
          control={control}
          name="description"
          label={t("form.labels.description")}
          placeholder={t("form.placeholders.description")}
          className="min-h-36"
          footer={<MarkdownHint label={t("form.labels.markdownHint")} />}
        />
      </FieldGroup>
    </FieldSet>
  );
}

function ServicesFields({ form }: FieldsProps) {
  const t = useTranslations("providers");
  const { control, register, formState } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "services",
  });

  return (
    <FieldSet>
      <FieldLegend>{t("form.sections.services")}</FieldLegend>
      <div className="space-y-3">
        {fields.map((item, index) => {
          const errors = formState.errors.services?.[index];
          return (
            <div key={item.id} className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-[2fr_1fr]">
                <Input
                  {...register(`services.${index}.name`)}
                  aria-label={t("form.labels.serviceName")}
                  aria-invalid={Boolean(errors?.name)}
                  placeholder={t("form.placeholders.serviceName")}
                />
                <Input
                  {...register(`services.${index}.price`)}
                  aria-label={t("form.labels.servicePrice")}
                  aria-invalid={Boolean(errors?.price)}
                  placeholder={t("form.placeholders.servicePrice")}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("form.actions.removeService")}
                onClick={() => remove(index)}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={fields.length >= MAX_PROVIDER_SERVICES}
          onClick={() => append({ name: "", price: "" })}
        >
          <PlusIcon className="size-4" />
          {t("form.actions.addService")}
        </Button>
      </div>
    </FieldSet>
  );
}

function ContactFields({ form }: FieldsProps) {
  const t = useTranslations("providers");
  const { control, formState } = form;
  const optionalHasError = optionalProviderContactFields.some(
    (name) => formState.errors[name],
  );
  const hasOptionalValue = optionalProviderContactFields.some((name) =>
    Boolean(formState.defaultValues?.[name]),
  );

  return (
    <FieldSet>
      <FieldLegend>{t("form.sections.contact")}</FieldLegend>
      <FieldGroup>
        <TextFormField
          control={control}
          name="whatsapp"
          type="tel"
          inputMode="tel"
          label={t("form.labels.whatsapp")}
          placeholder={t("form.placeholders.whatsapp")}
          description={t("form.hints.whatsapp")}
        />
        <OptionalSection
          title={`${t("form.labels.instagram")}, ${t("form.labels.facebook")}, ${t("form.labels.tiktok")}…`}
          description={t("form.hints.social")}
          defaultOpen={hasOptionalValue}
          forceOpen={optionalHasError}
        >
          {(["instagram", "facebook", "tiktok"] as const).map((network) => (
            <TextFormField
              key={network}
              control={control}
              name={network}
              label={t(`form.labels.${network}`)}
              placeholder={t("form.placeholders.social")}
              optional
            />
          ))}
          <TextFormField
            control={control}
            name="phone"
            type="tel"
            inputMode="tel"
            label={t("form.labels.phone")}
            placeholder={t("form.placeholders.phone")}
            optional
          />
          <TextFormField
            control={control}
            name="email"
            type="email"
            label={t("form.labels.email")}
            placeholder={t("form.placeholders.email")}
            optional
          />
          <TextFormField
            control={control}
            name="website"
            label={t("form.labels.website")}
            placeholder={t("form.placeholders.website")}
            optional
          />
        </OptionalSection>
      </FieldGroup>
    </FieldSet>
  );
}

function ImagesField({
  label,
  hint,
  state,
  actions,
  single = false,
  max = 1,
}: {
  label: string;
  hint?: string;
  state: FileUploadState;
  actions: FileUploadActions;
  single?: boolean;
  max?: number;
}) {
  const t = useTranslations("providers");
  const { files, errors } = state;
  const canAdd = files.length < max;

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
      <input {...actions.getInputProps()} aria-label={label} className="sr-only" />
      <div
        className="flex flex-wrap gap-3"
        onDragOver={actions.handleDragOver}
        onDrop={actions.handleDrop}
      >
        {files.map((file) => (
          <div
            key={file.id}
            className={`relative overflow-hidden bg-accent ${single ? "size-24 rounded-full" : "size-28 rounded-md"}`}
          >
            <Image
              alt={file.file.name}
              src={file.preview || ""}
              fill
              sizes="112px"
              className="object-cover"
              unoptimized
            />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label={t("form.actions.removeImage")}
              className="absolute right-1 top-1 size-6 rounded-full bg-background/90"
              onClick={() => actions.removeFile(file.id)}
            >
              <XIcon className="size-3" />
            </Button>
          </div>
        ))}
        {(canAdd || single) && (
          <button
            type="button"
            onClick={actions.openFileDialog}
            className={`flex flex-col items-center justify-center gap-1 border border-dashed text-muted-foreground text-xs transition-colors hover:bg-accent ${single ? "size-24 rounded-full" : "size-28 rounded-md"} ${single && files.length > 0 ? "hidden" : ""}`}
          >
            {single ? (
              <ImageIcon className="size-5" />
            ) : (
              <UploadIcon className="size-5" />
            )}
            <span className="px-2 text-center">
              {single ? t("form.actions.chooseLogo") : t("form.actions.addPhoto")}
            </span>
          </button>
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
