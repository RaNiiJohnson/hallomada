"use client";

import { useLocale, useTranslations } from "next-intl";

interface PriceDisplayProps {
  price: number | undefined;
  listingMode?: "rent" | "sale";
  className?: string;
}

export function PriceDisplay({
  price,
  listingMode,
  className = "",
}: PriceDisplayProps) {
  const locale = useLocale();
  const t = useTranslations("listing.details");

  if (price === undefined || price === null) {
    return null;
  }

  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(price);

  return (
    <span className={`font-medium ${className}`}>
      <span className="font-semibold">
        {formatted}
        {"\u00a0"}€
      </span>
      {listingMode === "rent" && (
        <span className="ml-1 text-muted-foreground text-sm font-normal">
          {t("perMonth")}
        </span>
      )}
    </span>
  );
}
