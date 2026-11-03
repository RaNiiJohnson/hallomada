"use client";

import { FounderBadge } from "@/components/founder-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { formatDateLong } from "@/lib/date";
import { api } from "@convex/_generated/api";
import { RENTAL_DOCUMENT_CATEGORIES } from "@convex/rentalFiles/values";
import { useQuery } from "convex/react";
import { ExternalLink, FileText, FolderLock, Lock, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

export function RentalFileView({ token }: { token: string }) {
  const t = useTranslations("rentalFile.view");
  const tDocs = useTranslations("rentalFile.documents");
  const tProfile = useTranslations("rentalFile.profile");
  const locale = useLocale();
  const dossier = useQuery(api.rentalFiles.queries.viewByToken, { token });

  if (dossier === undefined) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (dossier === null) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">{t("unavailableTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("unavailableText")}</p>
      </div>
    );
  }

  const { profile } = dossier;
  const yesNo = (value: boolean | undefined) =>
    value === undefined ? null : tProfile(value ? "yes" : "no");
  const facts = profile
    ? [
        [tProfile("occupation"), profile.occupation],
        [tProfile("employer"), profile.employer],
        [
          tProfile("income"),
          profile.netMonthlyIncome !== undefined
            ? new Intl.NumberFormat(locale, {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              }).format(profile.netMonthlyIncome)
            : undefined,
        ],
        [tProfile("household"), profile.householdSize?.toString()],
        [
          tProfile("moveIn"),
          profile.moveInDate ? formatDateLong(`${profile.moveInDate}T00:00:00`, locale) : undefined,
        ],
        [tProfile("pets"), yesNo(profile.pets)],
        [tProfile("smoker"), yesNo(profile.smoker)],
      ].filter((entry): entry is [string, string] => Boolean(entry[1]))
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-12">
      <header className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <FolderLock className="h-4 w-4" />
          {t("eyebrow")}
        </p>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold sm:text-3xl">
          {dossier.candidateName}
          <FounderBadge userId={dossier.candidateId} />
          {dossier.highlighted && (
            <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
              <Star className="h-3 w-3" />
              {t("highlighted")}
            </Badge>
          )}
        </h1>
        {dossier.listing && (
          <p className="text-sm text-muted-foreground">
            {t("for")}{" "}
            <Link href={`/listing/${dossier.listing.slug}`} className="font-medium text-foreground hover:underline">
              {dossier.listing.title}
            </Link>
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("validUntil", { date: formatDateLong(dossier.expiresAt, locale) })}
        </p>
      </header>

      {dossier.message && (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold">{t("message")}</h2>
          <p className="mt-2 whitespace-pre-line text-sm">{dossier.message}</p>
        </section>
      )}

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">{t("profile")}</h2>
        {facts.length === 0 && !profile?.about ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("noProfile")}</p>
        ) : (
          <>
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {profile?.about && (
              <p className="mt-4 whitespace-pre-line border-t pt-4 text-sm">{profile.about}</p>
            )}
          </>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">{t("documents")}</h2>
        {dossier.documents.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("noDocuments")}</p>
        ) : (
          <ul className="mt-3 divide-y">
            {RENTAL_DOCUMENT_CATEGORIES.flatMap((category) =>
              dossier.documents
                .filter((document) => document.category === category)
                .map((document) => (
                  <li key={document._id} className="flex items-center gap-3 py-2.5">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{document.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {tDocs(`categories.${category}.label`)}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={document.url} target="_blank" rel="noreferrer noopener">
                        <ExternalLink className="h-4 w-4" />
                        {t("open")}
                      </a>
                    </Button>
                  </li>
                )),
            )}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">{t("confidential")}</p>
    </div>
  );
}
