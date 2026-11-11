"use client";

import { Sparkles } from "lucide-react";
import { MagicCard } from "./ui/magic-card";
import { RainbowButton } from "./ui/rainbow-button";
import { useTheme } from "next-themes";
import { Link } from "@/i18n/navigation";

export default function CTApricing() {
  const { theme } = useTheme();
  return (
    <div className="mt-16 text-center max-w-6xl mx-auto">
      <MagicCard
        gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
        className="relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm p-6"
      >
        <div className="pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h3 className="text-2xl font-semibold leading-none tracking-tight">
              Passez au Premium
            </h3>
          </div>
          <p className="text-lg text-muted-foreground">
            Débloquez toutes les fonctionnalités pour maximiser vos opportunités
          </p>
        </div>
        <div className="space-y-6">
          <Link
            href="/pricing"
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <RainbowButton>Découvrir Premium</RainbowButton>
          </Link>
        </div>
      </MagicCard>
    </div>
  );
}
