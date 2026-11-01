"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

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
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { LocationPicker } from "@/lib/LocationPicker";
import {
  listingModeValues,
  listingTypeValues,
  optionalListingFields,
  type ListingFormValues,
} from "./listing-form-schema";

export function ListingFormFields({
  form,
  photos,
}: {
  form: UseFormReturn<ListingFormValues>;
  photos: ReactNode;
}) {
  const t = useTranslations("listing");
  const label = (key: string) => t(key as Parameters<typeof t>[0]);
  const { control } = form;
  const [extraInput, setExtraInput] = useState("");

  const listingMode = useWatch({ control, name: "listingMode" });
  const showMap = useWatch({ control, name: "showMap" });
  const description = useWatch({ control, name: "description" });
  const extras = useWatch({ control, name: "extras" }) ?? [];
  const { errors } = form.formState;
  const optionalHasError = optionalListingFields.some((name) => errors[name]);
  const contactChoiceMessage = t("form.validation.contactReq");

  const addExtra = () => {
    const trimmed = extraInput.trim();
    if (!trimmed || extras.includes(trimmed)) return;
    form.setValue("extras", [...extras, trimmed]);
    setExtraInput("");
  };

  const removeExtra = (index: number) =>
    form.setValue(
      "extras",
      extras.filter((_, i) => i !== index),
    );

  return (
    <div className="space-y-8">
      <FieldGroup className="space-y-4">
        <TextFormField
          control={control}
          name="title"
          label={t("form.labels.title")}
          placeholder={t("form.placeholders.title")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectFormField
            control={control}
            name="propertyType"
            label={t("form.labels.propertyType")}
            placeholder={t("form.placeholders.selectType")}
            options={listingTypeValues.map((value) => ({
              value,
              label: label(`labels.listingTypes.${value}`),
            }))}
          />
          <SelectFormField
            control={control}
            name="listingMode"
            label={t("form.labels.listingMode")}
            placeholder={t("form.placeholders.selectMode")}
            options={listingModeValues.map((value) => ({
              value,
              label: label(`labels.listingModes.${value}`),
            }))}
            onValueChange={(value) => {
              if (value === "sale") {
                form.setValue("deposit", "", { shouldDirty: true });
              }
            }}
          />
        </div>
        <TextFormField
          control={control}
          name="city"
          label={t("form.labels.city")}
          placeholder={t("form.placeholders.city")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextFormField
            control={control}
            name="price"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            label={t(listingMode === "sale" ? "form.labels.priceSale" : "form.labels.priceRent")}
          />
          <TextFormField
            control={control}
            name="area"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            label={t("form.labels.area")}
          />
          <TextFormField
            control={control}
            name="bedrooms"
            type="number"
            min="0"
            step="1"
            label={t("form.labels.bedrooms")}
          />
          <TextFormField
            control={control}
            name="bathrooms"
            type="number"
            min="0"
            step="1"
            label={t("form.labels.bathrooms")}
          />
          <TextFormField
            control={control}
            name="floor"
            type="number"
            step="1"
            label={t("form.labels.floor")}
          />
          <TextFormField
            control={control}
            name="availableFrom"
            type="date"
            label={t("form.labels.availableFrom")}
          />
        </div>
        <TextareaFormField
          control={control}
          name="description"
          label={t("form.labels.description")}
          placeholder={t("form.placeholders.description")}
          rows={6}
          className="min-h-32 resize-none"
          description={t("form.labels.descHint")}
          footer={
            <>
              <span className="text-xs tabular-nums text-muted-foreground">
                {description.length} {t("form.messages.chars")}
              </span>
              <MarkdownHint label={t("form.labels.markdownHint")} />
            </>
          }
        />
        {photos}
        <Field>
          <FieldLabel>{t("form.labels.contactMethods")}</FieldLabel>
          <FieldDescription>
            {t("form.labels.contactMethodsHint")}
          </FieldDescription>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["contactPhone", "tel", "tel"],
              ["contactEmail", "email", "email"],
            ] as const
          ).map(([name, type, autoComplete]) => (
            <Controller
              key={name}
              name={name}
              control={control}
              render={({ field, fieldState }) => {
                // "Pick at least one" is reported once below, not per field.
                const invalid =
                  fieldState.invalid &&
                  fieldState.error?.message !== contactChoiceMessage;
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor={name}>
                      {label(`form.labels.${name}`)}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={name}
                      type={type}
                      autoComplete={autoComplete}
                      placeholder={label(`form.placeholders.${name}`)}
                      aria-invalid={invalid}
                    />
                    {invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                );
              }}
            />
          ))}
        </div>
        <FieldError
          errors={[errors.contactPhone, errors.contactEmail].filter(
            (error) => error?.message === contactChoiceMessage,
          )}
        />
      </FieldGroup>

      <OptionalSection
        title={t("form.sections.moreDetails")}
        description={t("form.sections.moreDetailsDesc")}
        forceOpen={optionalHasError}
      >
        <TextFormField
          control={control}
          name="neighborhood"
          label={t("form.labels.neighborhood")}
          placeholder={t("form.placeholders.neighborhood")}
        />
        {listingMode === "rent" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextFormField
              control={control}
              name="charges"
                  type="number"
              min="0"
              step="0.01"
              label={t("form.labels.charges")}
            />
            <TextFormField
              control={control}
              name="deposit"
                  type="number"
              min="0"
              step="0.01"
              label={t("form.labels.deposit")}
            />
          </div>
        )}
        <Controller
          name="pets"
          control={control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="pets"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <FieldLabel htmlFor="pets" className="cursor-pointer">
                  {t("form.labels.pets")}
                </FieldLabel>
              </div>
            </Field>
          )}
        />
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="listing-show-map">
              {t("form.labels.showMap")}
            </FieldLabel>
            <FieldDescription>{t("form.labels.mapDesc")}</FieldDescription>
          </FieldContent>
          <Switch
            id="listing-show-map"
            checked={showMap}
            onCheckedChange={(checked) => {
              form.setValue("showMap", checked, { shouldDirty: true });
              if (!checked) {
                form.setValue("location", undefined, { shouldDirty: true });
              }
            }}
          />
        </Field>
        {showMap && (
          <Controller
            name="location"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("form.labels.mapPosition")}</FieldLabel>
                <LocationPicker
                  value={field.value}
                  onChange={field.onChange}
                  onCityChange={(city) => form.setValue("city", city)}
                  privacyMode
                />
              </Field>
            )}
          />
        )}
        <Field>
          <FieldLabel>{t("form.labels_extra.extras")}</FieldLabel>
          <FieldDescription>{t("form.labels_extra.extrasDesc")}</FieldDescription>
          <div className="flex gap-2">
            <Input
              value={extraInput}
              onChange={(e) => setExtraInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addExtra();
                }
              }}
              placeholder={t("form.placeholders.extras")}
              autoComplete="off"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addExtra}
              disabled={!extraInput.trim()}
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
          {extras.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {extras.map((extra, index) => (
                <span
                  key={extra}
                  className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm"
                >
                  {extra}
                  <button
                    type="button"
                    onClick={() => removeExtra(index)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                    aria-label={t("form.actions.removeExtra", { extra })}
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Field>
      </OptionalSection>
    </div>
  );
}
