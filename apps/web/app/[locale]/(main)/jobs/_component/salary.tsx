"use client";

import { useLocale } from "next-intl";

export interface ParsedSalary {
  amount: string;
  period: string;
  isNegotiable: boolean;
  raw: string;
}

export function parseSalary(value: string | null | undefined): ParsedSalary {
  if (!value || typeof value !== "string") {
    return { amount: "", period: "", isNegotiable: false, raw: "" };
  }

  // Check for "À négocier" or similar
  if (value.toLowerCase().includes("négocier")) {
    return { amount: "", period: "", isNegotiable: true, raw: value };
  }

  // Extract number from string
  const amountMatch = value.match(/(\d+(?:\.\d+)?)/);
  const amount = amountMatch ? amountMatch[1] : "";

  // Determine period
  let period = "";
  if (value.includes("/mois") || value.includes("mois")) {
    period = "mois";
  } else if (value.includes("/an") || value.includes("annuel")) {
    period = "an";
  } else if (value.includes("/heure") || value.includes("heure")) {
    period = "heure";
  }

  return { amount, period, isNegotiable: false, raw: value };
}

interface SalaryDisplayProps {
  salary: string | number;
  className?: string;
}

export function SalaryDisplay({ salary, className = "" }: SalaryDisplayProps) {
  const locale = useLocale();
  const parsed = parseSalary(typeof salary === "string" ? salary : null);

  if (parsed.isNegotiable) {
    return (
      <span className={`text-muted-foreground italic ${className}`}>
        À négocier
      </span>
    );
  }

  const numericSalary =
    typeof salary === "number"
      ? salary
      : parsed.amount
        ? Number(parsed.amount)
        : Number.NaN;

  if (Number.isFinite(numericSalary)) {
    const formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(numericSalary);

    return (
      <span className={`font-medium ${className}`}>
        <span className="font-semibold">
          {formatted}
          <span className="text-primary">{"\u00a0"}€</span>
        </span>
      </span>
    );
  }

  return <span className={className}>{salary}</span>;
}
