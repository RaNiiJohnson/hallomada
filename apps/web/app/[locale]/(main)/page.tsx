import { FAQSection } from "@/components/faq-section";
import {
  HomePageContent,
  HomePageSkeleton,
} from "@/components/home-page-content";
import { Locale } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <>
      <Suspense fallback={<HomePageSkeleton />}>
        <HomePageContent />
        <FAQSection />
      </Suspense>
    </>
  );
}
