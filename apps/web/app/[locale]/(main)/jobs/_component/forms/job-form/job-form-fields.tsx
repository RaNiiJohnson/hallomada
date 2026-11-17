"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import {
  Controller,
  useFieldArray,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import { XIcon } from "lucide-react";

import {
  DateFormField,
  OptionalSection,
  SelectFormField,
  TextareaFormField,
  TextFormField,
} from "@/components/form-fields";
import { MarkdownHint } from "@/components/markdown-hint";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import {
  jobTypeHasContract,
  jobTypeValues,
  requiresDurationOrStartDate,
  selectableContractTypes,
  showsWeeklyHours,
  workModeValues,
  workTimeValues,
} from "@hallomada/shared/job-offer-options";
import { LocationPicker } from "@/lib/LocationPicker";
import {
  optionalJobFields,
  salaryPeriodValues,
  type JobFormValues,
} from "./job-form-schema";

type T = ReturnType<typeof useTranslations<"jobs">>;

export function JobFormFields({ form }: { form: UseFormReturn<JobFormValues> }) {
  const t = useTranslations("jobs");
  const label = (key: string) => t(key as Parameters<T>[0]);
  const { control } = form;

  const type = useWatch({ control, name: "type" });
  const contractType = useWatch({ control, name: "contractType" });
  const workMode = useWatch({ control, name: "workMode" });
  const showMap = useWatch({ control, name: "showMap" });
  const description = useWatch({ control, name: "description" });

  const hasContract = jobTypeHasContract(type);
  const showDurationAndStart = requiresDurationOrStartDate(type, contractType);
  const showWeeklyHours = showsWeeklyHours(type);
  const isRemote = workMode === "remote";

  useEffect(() => {
    if (isRemote) {
      form.setValue("showMap", false);
      form.setValue("location", undefined, { shouldDirty: true });
    }
  }, [form, isRemote]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "certificates",
  });

  const { errors } = form.formState;
  const optionalHasError = optionalJobFields.some((name) => errors[name]);

  return (
    <div className="space-y-8">
      <FieldGroup className="space-y-4">
        <TextFormField
          control={control}
          name="title"
          label={t("form.labels.title")}
          placeholder={t("form.placeholders.title")}
        />
        <TextFormField
          control={control}
          name="company"
          label={t("form.labels.company")}
          placeholder={t("form.placeholders.company")}
        />
        <SelectFormField
          control={control}
          name="type"
          label={t("form.labels.jobType")}
          placeholder={t("form.placeholders.selectType")}
          options={jobTypeValues.map((value) => ({
            value,
            label: label(`labels.jobTypes.${value}`),
          }))}
          onValueChange={(value) => {
            // Only regular jobs carry a contract; clear it for every other type.
            if (!jobTypeHasContract(value as typeof type)) {
              form.setValue("contractType", undefined, { shouldValidate: true });
              form.setValue("workTime", undefined, { shouldValidate: true });
            }
          }}
        />
        {hasContract ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectFormField
              control={control}
              name="contractType"
              label={t("form.labels.contractType")}
              placeholder={t("form.placeholders.selectContract")}
              options={selectableContractTypes.map((value) => ({
                value,
                label: label(`labels.contracts.${value}`),
              }))}
            />
            <SelectFormField
              control={control}
              name="workTime"
              label={t("form.labels.workTime")}
              placeholder={t("form.placeholders.selectWorkTime")}
              options={workTimeValues.map((value) => ({
                value,
                label: label(`labels.workTimes.${value}`),
              }))}
            />
          </div>
        ) : null}
        <SelectFormField
          control={control}
          name="workMode"
          label={t("form.labels.workMode")}
          options={workModeValues.map((value) => ({
            value,
            label: label(`labels.workModes.${value}`),
          }))}
        />
        <TextFormField
          control={control}
          name="city"
          label={t(isRemote ? "form.labels.cityOptional" : "form.labels.city")}
          placeholder={t("form.placeholders.city")}
        />
        {isRemote ? (
          <TextFormField
            control={control}
            name="remoteLocation"
            optional
            label={t("form.labels.remoteLocation")}
            placeholder={t("form.placeholders.remoteLocation")}
          />
        ) : (
          <>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="job-show-map">
                  {t("form.labels.showMap")}
                </FieldLabel>
                <FieldDescription>{t("form.labels.mapDesc")}</FieldDescription>
              </FieldContent>
              <Switch
                id="job-show-map"
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
          </>
        )}
        {showDurationAndStart && (
          <div className="grid gap-4 sm:grid-cols-2">
            <DateFormField
              control={control}
              name="startDate"
              label={t("form.labels.startDate")}
            />
            <TextFormField
              control={control}
              name="duration"
              label={t("form.labels.duration")}
              placeholder={t("form.placeholders.duration")}
            />
          </div>
        )}
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
        <TextFormField
          control={control}
          name="contactEmail"
          type="email"
          label={t("form.labels.contactEmail")}
          placeholder={t("form.placeholders.contactEmail")}
        />
      </FieldGroup>

      <OptionalSection
        title={t("form.sections.moreDetails")}
        description={t("form.sections.moreDetailsDesc")}
        forceOpen={optionalHasError}
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <Controller
            name="salary"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="job-salary">
                  {t("form.labels.salary")}
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    {...field}
                    id="job-salary"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder={t("form.placeholders.amount")}
                  />
                  <InputGroupAddon align="inline-end" variant="boxed">
                    <InputGroupText>€</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <SelectFormField
            control={control}
            name="salaryPeriod"
            label={t("form.labels.period")}
            placeholder={t("form.placeholders.period")}
            options={salaryPeriodValues.map((value) => ({
              value,
              label: `/${label(`labels.salaryPeriods.${value}`)}`,
            }))}
          />
        </div>
        <TextFormField control={control} name="sector" optional label={t("form.labels.sector")} />
        {type === "internship" || type === "training" ? (
          <TextFormField
            control={control}
            name="trainingRequirements"
            optional
            label={t("form.labels.trainingRequirements")}
          />
        ) : null}
        {showWeeklyHours ? (
          <TextFormField
            control={control}
            name="weeklyHours"
            optional
            type="number"
            min="0"
            label={t("form.labels.weeklyHours")}
          />
        ) : null}
        <DateFormField
          control={control}
          name="applicationDeadline"
          optional
          label={t("form.labels.applicationDeadline")}
        />
        <TextareaFormField
          control={control}
          name="benefits"
          optional
          rows={3}
          label={t("form.labels.benefits")}
        />
        <TextFormField
          control={control}
          name="externalApplicationUrl"
          optional
          type="url"
          label={t("form.labels.externalApplicationUrl")}
        />
        <FieldSet>
          <FieldLegend variant="label">{t("form.labels.certificates")}</FieldLegend>
          <FieldDescription>{t("form.labels.certDesc")}</FieldDescription>
          <FieldGroup className="gap-4">
            {fields.map((item, index) => (
              <Controller
                key={item.id}
                name={`certificates.${index}.certificate`}
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <InputGroup>
                      <InputGroupInput
                        {...field}
                        id={`certificate-${index}`}
                        aria-invalid={fieldState.invalid}
                        placeholder={t("form.placeholders.cert")}
                        autoComplete="off"
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => remove(index)}
                          aria-label={`${index + 1}`}
                        >
                          <XIcon />
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ certificate: "" })}
              disabled={fields.length >= 5}
            >
              {t("form.actions.addCert")}
            </Button>
          </FieldGroup>
          {errors.certificates?.root && (
            <FieldError errors={[errors.certificates.root]} />
          )}
        </FieldSet>
      </OptionalSection>
    </div>
  );
}
