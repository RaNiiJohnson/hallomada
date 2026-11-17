import { HeroSection } from "@/components/hero-section";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ProviderDirectory } from "./_components/provider-directory";

export default async function ProvidersPage() {
  const t = await getTranslations("providers");

  return (
    <div className="min-h-screen bg-background pb-12">
      <HeroSection title={t("hero.title")} subtitle={t("hero.subtitle")} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Suspense>
          <ProviderDirectory />
        </Suspense>
      </div>
    </div>
  );
}
