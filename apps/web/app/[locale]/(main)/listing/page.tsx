import { HeroSection } from "@/components/hero-section";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListingList } from "./_component/List/listingList";
import { ListingActionsBar } from "./_component/ListingActionsBar";
import { RealEstatesFilters } from "./_component/listingFilters";
import { ListingPageSkeleton } from "./_component/skeleton";

export default async function ListingPage() {
  const t = await getTranslations("listing");

  return (
    <div className="min-h-screen bg-background pb-12">
      <HeroSection
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="relative">
          <Suspense fallback={<ListingPageSkeleton />}>
            <RealEstatesFilters />
            <ListingActionsBar />
            <ListingList />
          </Suspense>
        </div>

        {/*<div className="text-center flex flex-col items-center mt-16 p-8 bg-card border rounded-xl shadow-sm">
          <h3 className="text-2xl font-bold mb-4">{t("cta.title")}</h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            {t("cta.desc")}
          </p>
          <Suspense
            fallback={
              <div className="h-11 w-40 bg-muted rounded-md animate-pulse" />
            }
          >
            <CTAButton />
          </Suspense>
        </div>*/}
      </div>
    </div>
  );
}
