"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ComponentProps, type ReactNode } from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type BaseProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: ReactNode;
  optional?: boolean;
  description?: ReactNode;
};

function OptionalBadge() {
  const t = useTranslations("common");
  return (
    <span className="text-xs font-normal text-muted-foreground">
      {t("optional")}
    </span>
  );
}

function Label({
  htmlFor,
  label,
  optional,
}: {
  htmlFor: string;
  label: ReactNode;
  optional?: boolean;
}) {
  return (
    <FieldLabel htmlFor={htmlFor}>
      {label}
      {optional ? <OptionalBadge /> : null}
    </FieldLabel>
  );
}

export function TextFormField<T extends FieldValues>({
  control,
  name,
  label,
  optional,
  description,
  ...inputProps
}: BaseProps<T> &
  Omit<ComponentProps<typeof Input>, "name" | "value" | "onChange">) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <Label htmlFor={name} label={label} optional={optional} />
          <Input
            {...inputProps}
            {...field}
            value={field.value ?? ""}
            id={name}
            aria-invalid={fieldState.invalid}
            autoComplete="off"
          />
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

/** Date field (shadcn Calendar). The form value stays a "YYYY-MM-DD" string. */
export function DateFormField<T extends FieldValues>({
  control,
  name,
  label,
  optional,
  description,
  placeholder,
  min,
}: BaseProps<T> & { placeholder?: string; min?: string }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <Label htmlFor={name} label={label} optional={optional} />
          <DatePicker
            id={name}
            value={field.value ?? ""}
            onChange={field.onChange}
            placeholder={placeholder}
            min={min}
            clearable={optional}
            aria-invalid={fieldState.invalid}
          />
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function TextareaFormField<T extends FieldValues>({
  control,
  name,
  label,
  optional,
  description,
  footer,
  ...textareaProps
}: BaseProps<T> & {
  footer?: ReactNode;
} & Omit<ComponentProps<typeof Textarea>, "name" | "value" | "onChange">) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <Label htmlFor={name} label={label} optional={optional} />
          <Textarea
            {...textareaProps}
            {...field}
            value={field.value ?? ""}
            id={name}
            aria-invalid={fieldState.invalid}
          />
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          {footer}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function SelectFormField<T extends FieldValues>({
  control,
  name,
  label,
  optional,
  description,
  options,
  placeholder,
  onValueChange,
}: BaseProps<T> & {
  options: ReadonlyArray<{ value: string; label: ReactNode }>;
  placeholder?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <Label htmlFor={name} label={label} optional={optional} />
          <Select
            value={field.value ?? ""}
            onValueChange={(value) => {
              field.onChange(value);
              onValueChange?.(value);
            }}
          >
            <SelectTrigger id={name} aria-invalid={fieldState.invalid}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

/** Collapsed block for optional inputs so the essentials stay readable. */
export function OptionalSection({
  title,
  description,
  defaultOpen = false,
  forceOpen = false,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  defaultOpen?: boolean;
  /** Keeps the section open while it holds a validation error. */
  forceOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open || forceOpen} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between px-4 py-3 text-left"
        >
          <span>
            <span className="block font-medium">{title}</span>
            {description ? (
              <span className="block text-sm font-normal text-muted-foreground">
                {description}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 px-4 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
