"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const serviceCardLinkClasses =
  "group cursor-pointer rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.99] active:ring-1 active:ring-primary motion-reduce:transform-none";

export function HomePageContent() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const t = useTranslations("home");

  return (
    <div className="min-h-screen overflow-hidden flex flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-56px)] w-full items-center justify-center overflow-hidden">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-20 pt-16 text-center sm:pt-24">
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

      {/* Services Section */}
      <section className="py-8 sm:py-12 md:py-16 px-4 shrink-0">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl text-center mb-8 font-bold tracking-tight">
            <span className="relative inline-block">
              <span className="relative z-10">{t("title")}</span>
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {/* Communauté */}
            <Link href="/communities" className={serviceCardLinkClasses}>
              <Card className="flex h-full flex-col transition-colors group-active:border-primary dark:bg-card/35">
                <CardHeader>
                  <CardTitle className="text-xl">{t("community")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {t("communityDescription")}
                  </p>
                </CardContent>
                <CardFooter className="mt-auto pt-4 w-full">
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full justify-start pl-0 hover:bg-transparent group-hover:text-primary"
                  >
                    <div className="inline-flex items-center gap-2">
                      {t("discover")}
                      <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Button>
                </CardFooter>
              </Card>
            </Link>

            {/* Opportunités */}
            <Link href="/jobs" className={serviceCardLinkClasses}>
              <Card className="flex h-full flex-col transition-colors group-active:border-primary dark:bg-card/35">
                <CardHeader>
                  <CardTitle className="text-xl">
                    {t("opportunities")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {t("opportunitiesDescription")}
                  </p>
                </CardContent>
                <CardFooter className="mt-auto pt-4 w-full">
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full justify-start pl-0 hover:bg-transparent group-hover:text-primary"
                  >
                    <div className="inline-flex items-center gap-2">
                      {t("explore")}
                      <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Button>
                </CardFooter>
              </Card>
            </Link>

            {/* Immobilier */}
            <Link href="/listing" className={serviceCardLinkClasses}>
              <Card className="flex h-full flex-col transition-colors group-active:border-primary dark:bg-card/35">
                <CardHeader>
                  <CardTitle className="text-xl">{t("housing")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {t("housingDescription")}
                  </p>
                </CardContent>
                <CardFooter className="mt-auto pt-4 w-full">
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full justify-start pl-0 hover:bg-transparent group-hover:text-primary"
                  >
                    <div className="inline-flex items-center gap-2">
                      {t("seeListings")}
                      <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Button>
                </CardFooter>
              </Card>
            </Link>

            {/* Prestataires */}
            <Link href="/providers" className={serviceCardLinkClasses}>
              <Card className="flex h-full flex-col transition-colors group-active:border-primary dark:bg-card/35">
                <CardHeader>
                  <CardTitle className="text-xl">{t("providers")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {t("providersDescription")}
                  </p>
                </CardContent>
                <CardFooter className="mt-auto pt-4 w-full">
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full justify-start pl-0 hover:bg-transparent group-hover:text-primary"
                  >
                    <div className="inline-flex items-center gap-2">
                      {t("seeProviders")}
                      <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          </div>
        </div>
      </section>

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
      <section className="relative h-[80vh] w-full flex items-center justify-center">
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

      {/* Services Section Skeleton */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="h-12 bg-muted rounded-lg mb-12 w-64 mx-auto"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader>
                  <div className="h-12 w-12 bg-muted rounded mb-4"></div>
                  <div className="h-6 bg-muted rounded w-2/3"></div>
                  <div className="space-y-2 mt-2">
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-4/5"></div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex items-end">
                  <div className="h-10 bg-muted rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
