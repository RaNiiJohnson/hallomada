"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { Award, Check, Gift, Megaphone, Search, Sparkles, X } from "lucide-react";
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
const FREE_EXCLUDED = ["alerts", "highlight", "featured", "stats"] as const;

type PremiumFeature = { key: string; soon: boolean };

// One subscription covers both moments of a member's life on Hallomada:
// looking for something, then publishing something.
const PREMIUM_GROUPS: {
  key: "find" | "visible" | "everyone";
  icon: typeof Search;
  features: PremiumFeature[];
}[] = [
  {
    key: "find",
    icon: Search,
    features: [
      { key: "alerts", soon: true },
      { key: "savedSearches", soon: true },
      { key: "highlight", soon: true },
      { key: "rentalFile", soon: true },
    ],
  },
  {
    key: "visible",
    icon: Megaphone,
    features: [
      { key: "featured", soon: true },
      { key: "boost", soon: true },
      { key: "stats", soon: true },
      { key: "priority", soon: true },
      { key: "quotas", soon: false },
    ],
  },
  {
    key: "everyone",
    icon: Sparkles,
    features: [{ key: "premiumBadge", soon: true }],
  },
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

            <p className="text-sm font-medium">{t("premium.oneSubscription")}</p>

            {PREMIUM_GROUPS.map(({ key, icon: Icon, features }) => (
              <FeatureGroup
                key={key}
                title={t(`premium.groups.${key}`)}
                icon={<Icon className="h-3.5 w-3.5" />}
              >
                {features.map((feature) => (
                  <FeatureItem key={feature.key} icon="check">
                    <span>{t(`premium.features.${feature.key}`)}</span>
                    {feature.soon && (
                      <Badge variant="secondary" className="ml-2 align-middle">
                        {t("soon")}
                      </Badge>
                    )}
                  </FeatureItem>
                ))}
              </FeatureGroup>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 sm:flex-row sm:items-start">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
            <Award className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h2 className="font-semibold">{t("founder.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("founder.text")}</p>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t("faq.question")}{" "}
          <Link href="/faq" className="font-medium text-primary hover:underline">
            {t("faq.link")}
          </Link>
        </p>
      </div>
    </section>
  );
}

function FeatureGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 border-t border-dashed pt-5">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
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
