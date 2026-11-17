"use client";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Link } from "@/i18n/navigation";
import { playwriteLight } from "@/web/fonts";
import { useConvexAuth } from "convex/react";
import {
  ArrowRightIcon,
  Globe,
  HandHeart,
  Heart,
  Sparkles,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { HomeLatest } from "./home-latest";
import PricingPage from "./pricing";
import { Skeleton } from "./ui/skeleton";

const iconMap = {
  Heart,
  Globe,
  HandHeart,
  Users,
  Sparkles,
} as const;

const reviews = [
  { icon: "Heart", key: "mission" },
  { icon: "Globe", key: "vision" },
  { icon: "HandHeart", key: "values" },
  { icon: "Users", key: "commitment" },
  { icon: "Sparkles", key: "identity" },
] as const;

export function HomePageContent() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const t = useTranslations("home");

  return (
    <div className="min-h-screen overflow-hidden flex flex-col">
      {/* Hero Section */}
      {/* Content height, not full screen: the latest jobs must peek in below the fold. */}
      <section className="relative flex w-full items-center justify-center overflow-hidden">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-8 pt-16 text-center sm:pb-12 sm:pt-24">
          {/* Small label */}
          <div
            className={`
            ${playwriteLight.className} mb-8 inline-flex items-center rounded-full border border-border/70 bg-card/60 px-4 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-sm`}
          >
            <span className="mr-2 h-2 w-2 font-light rounded-full bg-primary" />
            Hallo Hallo
          </div>

          <h1 className="max-w-4xl text-balance text-4xl font-medium leading-tight tracking-tight sm:text-5xl md:text-6xl md:leading-[1.05] lg:text-7xl">
            {t("hero.headlinePrefix")}{" "}
            <span className="font-light text-primary">
              {t("hero.headlineHighlight")}
            </span>
            {t("hero.headlineSuffix")}
          </h1>

          {/* Subtitle */}
          <p className="mt-7 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            {t("hero.description")}
          </p>

          {/* CTA */}
          <div className="mt-9 flex flex-col items-center gap-4">
            {isLoading ? (
              <Skeleton className="h-12 w-52 rounded-full" />
            ) : isAuthenticated ? (
              <Link
                href="/communities"
                className="group inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
              >
                <Users className="mr-2 h-4 w-4" />
                {t("hero.authenticatedCta")}
                <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="group inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
              >
                {t("hero.loginCta")}
                <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            )}

            <span className="text-xs text-muted-foreground">
              {t("hero.categories")}
            </span>
          </div>
        </div>
      </section>

      {/* Latest jobs, housing, providers and discussions, one block per service */}
      <HomeLatest />

      {/* About Us Section */}
      <section className="py-8 sm:py-12 bg-secondary md:py-16 px-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl text-center mb-8 font-bold tracking-tight">
            <span className="relative inline-block">
              <span className="relative z-10">{t("aboutTitle")}</span>
            </span>
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {reviews.slice(0, 4).map((review) => {
              const IconComponent = iconMap[review.icon];
              return (
                <Item key={review.icon} variant="default">
                  <ItemMedia variant="icon">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>
                      {t(`reviews.${review.key}.titleAccordion`)}
                    </ItemTitle>
                    <ItemDescription>
                      {t(`reviews.${review.key}.description`)}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing: Free and Premium (Premium offered for now) */}
      <PricingPage variant="section" />
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* Hero Section Skeleton */}
      <section className="relative w-full flex items-center justify-center pt-16 pb-8 sm:pt-24 sm:pb-12">
        <div className="text-center p-4 max-w-4xl mx-auto">
          <div className="h-20 md:h-24 bg-muted rounded-lg mb-6 w-3/4 mx-auto"></div>
          <div className="space-y-3 mb-8">
            <div className="h-6 bg-muted rounded w-full"></div>
            <div className="h-6 bg-muted rounded w-5/6 mx-auto"></div>
            <div className="h-6 bg-muted rounded w-4/5 mx-auto"></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="h-14 bg-muted rounded-lg w-48"></div>
            <div className="h-14 bg-muted rounded-lg w-48"></div>
          </div>
        </div>
      </section>
    </div>
  );
}
