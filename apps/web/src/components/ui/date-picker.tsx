"use client";

import { format } from "date-fns";
import { de, enGB, fr } from "date-fns/locale";
import { CalendarIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const locales = { fr, de, en: enGB } as const;

/** "2026-03-07" → local Date (no timezone shift). */
function parseDay(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Local Date → "2026-03-07". */
function formatDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

type DatePickerProps = {
  id?: string;
  /** "YYYY-MM-DD", or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Show a button to empty the field. */
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  /** Earliest / latest selectable day, as "YYYY-MM-DD". */
  min?: string;
  max?: string;
};

/**
 * Date field built on the shadcn Calendar. Keeps the "YYYY-MM-DD" string that
 * `<input type="date">` used, so forms and API calls do not change.
 */
function DatePicker({
  id,
  value,
  onChange,
  placeholder,
  clearable = false,
  disabled,
  className,
  min,
  max,
  ...props
}: DatePickerProps) {
  const t = useTranslations("common");
  const locale = useLocale() as keyof typeof locales;
  const dateLocale = locales[locale] ?? enGB;
  const [open, setOpen] = React.useState(false);
  const selected = parseDay(value);
  const minDate = min ? parseDay(min) : undefined;
  const maxDate = max ? parseDay(max) : undefined;
  const thisYear = new Date().getFullYear();

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={props["aria-invalid"]}
            data-empty={!selected}
            className={cn(
              "w-full justify-start px-3 text-left font-normal data-[empty=true]:text-muted-foreground aria-invalid:border-destructive",
              clearable && selected && "pr-9",
              className,
            )}
          >
            <CalendarIcon className="size-4 shrink-0 opacity-70" />
            <span className="truncate">
              {selected
                ? format(selected, "PPP", { locale: dateLocale })
                : (placeholder ?? t("pickDate"))}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={dateLocale}
            selected={selected}
            defaultMonth={selected ?? minDate}
            captionLayout="dropdown"
            startMonth={minDate ?? new Date(thisYear - 1, 0)}
            endMonth={maxDate ?? new Date(thisYear + 6, 11)}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
            onSelect={(date) => {
              if (date) onChange(formatDay(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {clearable && selected && !disabled && (
        <button
          type="button"
          aria-label={t("clear")}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
          onClick={() => onChange("")}
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

export { DatePicker };
