import { HeroSection } from "@/components/hero-section";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { JobActionsBar } from "./_component/JobActionsBar";
import { JobFilters } from "./_component/jobFilters";
import { JobList } from "./_component/jobList";
import { JobFiltersSkeleton, JobPageSkeleton } from "./_component/skeleton";

export default async function JobsPage() {
  const t = await getTranslations("jobs");

  return (
    <div className="min-h-screen bg-background pb-12">
      <HeroSection
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.description")}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="relative">
          <Suspense
            fallback={
              <div className="space-y-6">
                <JobFiltersSkeleton />
                <JobPageSkeleton />
              </div>
            }
          >
            <JobFilters />
            <JobActionsBar />
            <JobList />
          </Suspense>
        </div>

        {/* Call to action */}
        {/*<div className="text-center flex flex-col items-center mt-16 p-8 bg-card border rounded-xl shadow-sm">
          <h3 className="text-2xl font-bold mb-4">{t("cta.title")}</h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            {t("cta.description")}
          </p>
          <Suspense
            fallback={
              <div className="h-11 w-40 bg-muted rounded-md animate-pulse" />
            }
          >
            <JobCTAButton />
          </Suspense>
        </div>*/}
      </div>
    </div>
  );
}
