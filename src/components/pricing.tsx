"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, Gift, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Plan content. Keys map to `pricing.json`. Set `soon: false` once a
 * Premium feature is actually live so its "Coming soon" tag disappears.
 */
const FREE_INCLUDED = [
  "browse",
  "contact",
  "messages",
  "communities",
  "bookmarks",
] as const;
const FREE_LIMITS = ["listings", "jobs", "communities", "moderation"] as const;
const FREE_EXCLUDED = ["featured", "boost", "stats", "alerts"] as const;

const PREMIUM_FEATURES: { key: string; soon: boolean }[] = [
  { key: "alerts", soon: true },
  { key: "featured", soon: true },
  { key: "boost", soon: true },
  { key: "priority", soon: true },
  { key: "stats", soon: true },
  { key: "quotas", soon: false },
];

export default function PricingPage() {
  const t = useTranslations("pricing");

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h1 className="text-3xl font-semibold md:text-4xl">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        <div className="mt-10 grid items-start gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 lg:p-8">
            <div>
              <h2 className="font-medium">{t("free.name")}</h2>
              <p className="mt-3 text-3xl font-semibold">
                {t("free.price")}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  {t("perMonth")}
                </span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("free.tagline")}
              </p>
            </div>

            <FeatureGroup title={t("free.includedTitle")}>
              {FREE_INCLUDED.map((key) => (
                <FeatureItem key={key} icon="check">
                  {t(`free.included.${key}`)}
                </FeatureItem>
              ))}
            </FeatureGroup>

            <FeatureGroup title={t("free.limitsTitle")}>
              {FREE_LIMITS.map((key) => (
                <FeatureItem key={key} icon="dot">
                  {t(`free.limits.${key}`)}
                </FeatureItem>
              ))}
            </FeatureGroup>

            <FeatureGroup title={t("free.excludedTitle")}>
              {FREE_EXCLUDED.map((key) => (
                <FeatureItem key={key} icon="x">
                  {t(`free.excluded.${key}`)}
                </FeatureItem>
              ))}
            </FeatureGroup>
          </div>

          {/* Premium */}
          <div className="relative order-first flex flex-col gap-6 rounded-xl border-2 border-primary bg-card p-6 shadow-lg shadow-primary/10 md:order-none lg:p-8">
            <Badge className="absolute -top-3 left-6">{t("premium.current")}</Badge>

            <div>
              <h2 className="flex items-center gap-2 font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                {t("premium.name")}
              </h2>
              <p className="mt-3 text-3xl font-semibold">
                {t("premium.price")}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  {t("perMonth")}
                </span>
              </p>
              <div className="mt-4 flex gap-3 rounded-lg bg-primary/10 p-3 text-sm">
                <Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  <span className="font-semibold">
                    {t("premium.offerTitle")}
                  </span>{" "}
                  {t("premium.offerText")}
                </p>
              </div>
            </div>

            <FeatureGroup title={t("premium.featuresTitle")}>
              {PREMIUM_FEATURES.map(({ key, soon }) => (
                <FeatureItem key={key} icon="check">
                  <span>{t(`premium.features.${key}`)}</span>
                  {soon && (
                    <Badge variant="secondary" className="ml-2 align-middle">
                      {t("soon")}
                    </Badge>
                  )}
                </FeatureItem>
              ))}
            </FeatureGroup>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 border-t border-dashed pt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

function FeatureItem({
  icon,
  children,
}: {
  icon: "check" | "x" | "dot";
  children: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-2",
        icon === "x" && "text-muted-foreground",
      )}
    >
      {icon === "check" && (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
      )}
      {icon === "x" && <X className="mt-0.5 h-4 w-4 shrink-0" />}
      {icon === "dot" && (
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
      )}
      <span>{children}</span>
    </li>
  );
}
