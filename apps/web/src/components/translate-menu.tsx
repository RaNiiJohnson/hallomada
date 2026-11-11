"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SupportedLang } from "@/hooks/use-manual-translate";
import { Check, Languages } from "lucide-react";
import { useTranslations } from "next-intl";

const LANGS: { code: SupportedLang; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
];

export function TranslateMenu({
  activeLang,
  pendingLang,
  onTranslateAction,
  onResetAction,
  className,
}: {
  activeLang: SupportedLang | null;
  pendingLang: SupportedLang | null;
  onTranslateAction: (lang: SupportedLang) => void;
  onResetAction: () => void;
  className?: string;
}) {
  const t = useTranslations("common");
  const isPending = pendingLang !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="link"
          size="lg"
          disabled={isPending}
          className={
            className ??
            "group flex items-center gap-1.5 text-muted-foreground hover:text-accent-foreground transition-colors h-8 px-2"
          }
        >
          <Languages size={15} />
          <span className=" font-bold">
            {activeLang
              ? t("translatedTo", { lang: activeLang.toUpperCase() })
              : t("button")}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        {LANGS.map(({ code, label }) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => onTranslateAction(code)}
            disabled={activeLang === code}
          >
            <span className="flex-1">{label}</span>
            {activeLang === code && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}

        {activeLang && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onResetAction}>
              {t("viewOriginal")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
