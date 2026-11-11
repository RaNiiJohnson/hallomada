"use client";

import { useTransition } from "react";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Locale } from "next-intl";

export default function LocaleSwitcherSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();
  const currentLocale = (params.locale as string) || "fr";

  function switchLocale(nextLocale: string) {
    startTransition(() => {
      router.replace(pathname, {
        locale: nextLocale as Locale,
      });
    });
  }

  return (
    <div
      className="inline-flex h-8 items-center justify-center rounded-full bg-muted/60 dark:bg-muted/40 p-1 text-muted-foreground border border-border/60 shadow-sm"
      role="radiogroup"
      aria-label="Sélection de la langue"
    >
      {routing.locales.map((locale) => {
        const isSelected = currentLocale === locale;
        return (
          <button
            key={locale}
            onClick={() => switchLocale(locale)}
            disabled={isPending}
            role="radio"
            aria-checked={isSelected}
            className={`
              relative flex h-5 items-center justify-center rounded-full px-2 text-xs font-semibold uppercase tracking-wider transition-all select-none
              ${isPending ? "opacity-50 pointer-events-none" : "cursor-pointer"}
              ${
                isSelected
                  ? "bg-background text-foreground shadow-sm dark:shadow-md dark:border dark:border-border/80 font-bold scale-[1.02]"
                  : "hover:text-foreground text-muted-foreground/70 dark:text-muted-foreground/90 hover:dark:text-foreground"
              }
            `}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
}
