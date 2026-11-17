"use client";

import { ReactNode } from "react";

interface HeroSectionProps {
  children?: ReactNode;
  title: string;
  subtitle: string;
  /**
   * Small pill above the title, e.g. "Immobilier" — like the "• Pricing" /
   * "• Product updates" pill on Lumail's inner pages. Hardcoded for now
   * (no translation key yet) — wire it into next-intl once we're happy
   * with the copy.
   */
  eyebrow?: string;
}

export function HeroSection({ children, title, subtitle }: HeroSectionProps) {
  return (
    <div className="relative w-full bg-background text-foreground">
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-4 pt-16 pb-4 text-center sm:pt-24 sm:pb-6">
        {/* Narrow text column — Lumail's inner-page headline width, not the full 6xl container */}
        <div className="mx-auto max-w-2xl">
          {/*{eyebrow && (
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="size-1 rounded-full bg-primary" />
              {eyebrow}
            </span>
          )}*/}

          <h1 className="mb-4 font-(family-name:--font-bricolage) text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
          <p className="text-base text-foreground/70 sm:text-lg">{subtitle}</p>
        </div>

        {/* Filters Container — can stay wider than the text column */}
        {children && (
          <div className="mt-10 w-full max-w-4xl rounded-lg bg-background/95 p-4 text-foreground shadow-xl backdrop-blur-sm">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
