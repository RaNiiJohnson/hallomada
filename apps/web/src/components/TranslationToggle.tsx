"use client";

import { Button } from "@/components/ui/button";
import { Languages, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function TranslationToggle({
  isTranslating,
  showOriginal,
  onToggleAction,
  className,
}: {
  isTranslating: boolean;
  showOriginal: boolean;
  onToggleAction: () => void;
  className?: string;
}) {
  const t = useTranslations("common");

  if (isTranslating) {
    return (
      <span
        className={
          className ??
          "inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        }
      >
        <Loader2 className="size-3.5 animate-spin" />
        {t("translating")}
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      aria-pressed={showOriginal}
      onClick={onToggleAction}
      className={
        className ??
        "h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
      }
    >
      <Languages className="size-3.5" />
      {showOriginal ? t("showTranslated") : t("showOriginal")}
    </Button>
  );
}
