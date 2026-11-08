"use client";

import { FounderBadge } from "@/components/founder-badge";
import { ShareButton } from "@/components/ShareButton";
import { MobileActionsMenu } from "@/components/mobile-actions-menu";
import { ReportDialog } from "@/components/report-dialog";
import { TranslateMenu } from "@/components/translate-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getFreshTranslation,
  getSupportedTranslationLanguage,
  useManualTranslate,
} from "@/hooks/use-manual-translate";
import { ApplicationQuotaNotice } from "@/components/application-quota-notice";
import {
  isQuotaReached,
  useApplicationQuota,
} from "@/hooks/use-application-quota";
import { useTimeTranslations } from "@/hooks/use-time-translations";
import { Link } from "@/i18n/navigation";
import { useAuthRequiredAction } from "@/hooks/use-auth-required-action";
import { formatDateLong, getRelativeTime } from "@/lib/date";
import { ReceivedApplications } from "./_component/received-applications";
import { PublicationStats } from "@/components/featured/publication-stats";
import { useRecordView } from "@/hooks/use-record-view";
import { getConvexErrorCode } from "@/lib/convex-error";
import { getSafeExternalUrl } from "@/lib/external-url";
import { LocationMap } from "@/lib/LocationMap";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { useAction, useConvex, useConvexAuth } from "convex/react";
import {
  ArrowLeft,
  Award,
  Briefcase,
  Building2,
  ChevronRight,
  Clock3,
  FileText,
  Mail,
  MapPin,
  Pencil,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { toast } from "sonner";
import { ApplyJobDialog } from "../_component/dialogs/applyJobDialog";
import { contractLabelKeys } from "@/lib/job-offer-options";
import { JobLifecycleActions } from "../_component/jobLifecycleActions";
import { SalaryDisplay } from "../_component/salary";
import { JobBookmarkButton } from "../_component/JobBookmarkButton";
import { JobDetailsSkeleton } from "../_component/skeleton";

export default function JobDetailsPage() {
  const { id } = useParams();
  const user = useQuery(api.auth.auth.getCurrentUser);
  const quotaReached = isQuotaReached(useApplicationQuota());
  const { isAuthenticated, isLoading } = useConvexAuth();
  const requireAuthentication = useAuthRequiredAction();

  const timeT = useTimeTranslations();
  const locale = useLocale();
  const t = useTranslations("jobs");
  const te = useTranslations("common");

  const jobOffer = useQuery(api.jobs.queries.getJobWithContact, {
    slug: id as string,
  });
  useRecordView(jobOffer ? { type: "job", id: jobOffer._id } : null);
  const applicationEmailStatus = useQuery(
    api.jobs.queries.hasCurrentUserAppliedToJob,
    jobOffer ? { jobId: jobOffer._id } : "skip",
  );

  // const translated = useTranslatedJob(jobOffer);

  const translateJob = useAction(api.jobs.translate.translateJob);
  const convex = useConvex();
  const retryApplicationEmail = useAction(
    api.jobs.actions.retryApplicationEmail,
  );
  const [isRetryingApplicationEmail, setIsRetryingApplicationEmail] =
    useState(false);
  const translationLanguage = getSupportedTranslationLanguage(locale);
  const cachedTranslation = useQuery(
    api.jobs.translate.getTranslation,
    jobOffer && translationLanguage
      ? { jobId: jobOffer._id, language: translationLanguage }
      : "skip",
  );
  const cached = getFreshTranslation(cachedTranslation, jobOffer?.updatedAt);

  const { data, activeLang, pendingLang, selectTranslation, reset } =
    useManualTranslate(
      (lang) => {
        if (!jobOffer) throw new Error("jobOffer not loaded");
        return translateJob({ jobId: jobOffer._id, targetLanguage: lang });
      },
      {
        onError: () => toast.error(te("translateError")),
        initialTranslation:
          cached && translationLanguage
            ? { lang: translationLanguage, data: cached }
            : null,
        loadCached: async (lang) => {
          if (!jobOffer) return null;
          return getFreshTranslation(
            await convex.query(api.jobs.translate.getTranslation, {
              jobId: jobOffer._id,
              language: lang,
            }),
            jobOffer.updatedAt,
          );
        },
      },
    );

  if (jobOffer === undefined) {
    return <JobDetailsSkeleton />;
  }

  if (jobOffer === null) {
    return notFound();
  }

  const translation = data;
  const title = translation?.title ?? jobOffer.title;
  const description = translation?.description ?? jobOffer.description;
  const city = translation?.city ?? jobOffer.city;
  const handleTranslate = (
    language: Parameters<typeof selectTranslation>[0],
  ) =>
    void selectTranslation(language, {
      canCreate: isAuthenticated,
      onCreateRequired: requireAuthentication,
    });
  const locationLabel =
    jobOffer.workMode === "remote"
      ? jobOffer.remoteLocation || t("labels.workModes.remote")
      : city;
  const externalApplicationUrl = getSafeExternalUrl(
    jobOffer.externalApplicationUrl,
  );
  const formatStoredDate = (value: string) =>
    formatDateLong(`${value}T00:00:00`, locale);

  const handleApplicationEmailRetry = async () => {
    setIsRetryingApplicationEmail(true);
    try {
      await retryApplicationEmail({
        jobId: jobOffer._id,
        locale: locale as Locale,
      });
      toast.success(t("details.applicationDeliveryRetried"));
    } catch (error) {
      toast.error(
        getConvexErrorCode(error) === "LIMIT_REACHED"
          ? t("details.applicationDeliveryRetryLimit")
          : t("details.applicationDeliveryRetryFailed"),
      );
    } finally {
      setIsRetryingApplicationEmail(false);
    }
  };

  const isAuthor = user?._id === jobOffer.authorId;
  const isAcceptingApplications =
    jobOffer.status === undefined || jobOffer.status === "active";
  const actionsReady = !isLoading && user !== undefined;
  const showMobileApplicationBar = actionsReady && !isAuthor;

  const renderOwnerActions = () => (
    <>
      <JobLifecycleActions jobId={jobOffer._id} status={jobOffer.status} />
      <ShareButton text={jobOffer.title} showLabel />
      <Button size="sm" className="gap-2" asChild>
        <Link href={`/jobs/${id}/edit`}>
          <Pencil className="h-4 w-4" />
          <span>{t("dialogs.edit.trigger")}</span>
        </Link>
      </Button>
    </>
  );

  const renderApplicationAction = (className?: string) => {
    if (!isAuthenticated) {
      return (
        <Button
          variant="default"
          size="sm"
          className={`gap-2 ${className ?? ""}`}
          disabled={!isAcceptingApplications}
          onClick={requireAuthentication}
        >
          <Mail className="w-4 h-4" />
          {isAcceptingApplications ? t("details.apply") : t("details.closed")}
        </Button>
      );
    }

    if (applicationEmailStatus === "failed") {
      return (
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${className ?? ""}`}
          disabled={isRetryingApplicationEmail}
          onClick={handleApplicationEmailRetry}
        >
          <Mail className="w-4 h-4" />
          {isRetryingApplicationEmail
            ? t("details.applicationDeliveryRetrying")
            : t("details.applicationDeliveryRetry")}
        </Button>
      );
    }

    if (!isAcceptingApplications) {
      return (
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${className ?? ""}`}
          disabled
        >
          <Mail className="w-4 h-4" />
          {t("details.closed")}
        </Button>
      );
    }

    if (applicationEmailStatus === undefined) {
      return (
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${className ?? ""}`}
          disabled
        >
          <Mail className="w-4 h-4" />
          {t("details.apply")}
        </Button>
      );
    }

    if (applicationEmailStatus !== "none") {
      return (
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${className ?? ""}`}
          disabled
        >
          <Mail className="w-4 h-4" />
          {t("details.alreadyApplied")}
        </Button>
      );
    }

    return (
      <ApplyJobDialog jobOffer={jobOffer}>
        <Button
          variant="default"
          size="sm"
          className={`gap-2 ${className ?? ""}`}
          disabled={applicationEmailStatus === undefined || quotaReached}
        >
          <Mail className="w-4 h-4" />
          {t("details.apply")}
        </Button>
      </ApplyJobDialog>
    );
  };

  const renderVisitorActions = () => (
    <>
      {renderApplicationAction()}
      <ShareButton text={jobOffer.title} showLabel />
      {user !== undefined && !isAuthor ? (
        <ReportDialog
          target={{ type: "job", id: jobOffer._id }}
          showLabel
          size="sm"
          variant="outline"
        />
      ) : null}
      <JobBookmarkButton
        jobId={jobOffer._id}
        initialBookmark={jobOffer.isBookmarked}
        className="mt-0 h-8"
        showLabel
      />
    </>
  );

  return (
    <div
      className={`min-h-screen bg-muted/50 ${showMobileApplicationBar ? "pb-24 sm:pb-0" : ""}`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background/90 px-4 py-3 text-sm text-muted-foreground backdrop-blur sm:hidden">
        <Button variant="ghost" size="sm" className="-ml-2 px-2" asChild>
          <Link href="/jobs">
            <ArrowLeft className="size-4" />
            {t("details.backToList")}
          </Link>
        </Button>

        {actionsReady ? (
          <div className="shrink-0">
            <MobileActionsMenu>
              {isAuthor ? renderOwnerActions() : renderVisitorActions()}
            </MobileActionsMenu>
          </div>
        ) : null}
      </div>

      {/* Hero Section without image */}
      <div className="relative w-full">
        <div className="max-w-full mx-auto px-4 pt-2 sm:pt-8">
          {/* Breadcrumb */}
          <div className="mb-4 hidden min-w-0 items-center gap-2 text-sm text-muted-foreground sm:flex">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Link
                href="/jobs"
                className="shrink-0 transition-colors hover:text-foreground"
              >
                {t("details.breadcrumb")}
              </Link>
              <ChevronRight className="size-4 shrink-0" />
              <span className="truncate font-medium text-foreground">
                {title}
              </span>
            </div>
          </div>

          {jobOffer.status === "pending" ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-left">
              <Clock3 className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold">{t("details.pendingTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("details.pendingDescription")}
                </p>
              </div>
            </div>
          ) : null}

          {/* Job Header */}
          <div className="text-center mb-8">
            {/* Company Icon/Logo placeholder */}
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-2xl mb-6">
              <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>

            {/* Job Title */}
            <div className="mb-4 flex justify-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                {title}
              </h1>
            </div>

            {/* Posted by */}
            <div className="text-sm sm:text-base text-muted-foreground mb-6">
              {isLoading ? (
                <div className="flex items-center justify-center w-full">
                  <Skeleton className="w-[300px] h-[24px] rounded-full border border-muted select-none pointer-events-none" />
                </div>
              ) : isAuthor ? (
                <>
                  <span className="font-semibold text-foreground">
                    {t("details.you")}
                  </span>{" "}
                  {t("details.have")}
                </>
              ) : (
                <>
                  {jobOffer.authorSlug ? (
                    <Link
                      href={`/hl/${jobOffer.authorSlug}`}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {jobOffer.authorName || t("details.anonymous")}
                    </Link>
                  ) : (
                    <span className="font-semibold text-foreground">
                      {jobOffer.authorName || t("details.anonymous")}
                    </span>
                  )}{" "}
                  <FounderBadge userId={jobOffer.authorId} compact />{" "}
                </>
              )}{" "}
              {!isLoading && (
                <>
                  {t("details.postedBy")}{" "}
                  {getRelativeTime(jobOffer._creationTime, timeT)}
                </>
              )}
            </div>

            {/* toggle translation  (original / traduit) */}
            <div className="mb-4 flex justify-center">
              <TranslateMenu
                activeLang={activeLang}
                pendingLang={pendingLang}
                onTranslateAction={handleTranslate}
                onResetAction={reset}
              />
            </div>

            {/* Divider */}
            <Separator className="w-20 h-1 bg-primary mx-auto mb-4" />

            <div className="flex lg:flex-row flex-col justify-between items-center gap-4">
              {/* Job Meta Information */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-sm sm:text-base">
                {/* Company */}
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/60" />
                  <span className="font-medium">{jobOffer.company}</span>
                </div>

                {/* Role */}
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/60" />
                  <span className="font-medium">
                    {contractLabelKeys(jobOffer)
                      .map((key) => t(key as Parameters<typeof t>[0]))
                      .join(" · ")}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary/60" />
                  <span className="font-medium">{locationLabel}</span>
                </div>
              </div>

              {/* Company Links / Edit Button */}
              <div className="hidden min-w-0 max-w-full flex-wrap items-center justify-center gap-3 sm:flex">
                {!actionsReady ? (
                  <Skeleton className="w-[250px] h-[42px] rounded-full border border-muted select-none pointer-events-none" />
                ) : isAuthor ? (
                  <InputGroup className="h-auto w-fit max-w-full flex-wrap justify-center overflow-hidden border-0 bg-transparent shadow-none dark:bg-transparent *:shrink-0 *:rounded-none! *:border-0! [&>*:not(:last-child)]:border-r!">
                    {renderOwnerActions()}
                  </InputGroup>
                ) : (
                  <InputGroup className="h-auto w-fit max-w-full flex-wrap justify-center overflow-hidden border-0 bg-transparent shadow-none dark:bg-transparent *:shrink-0 *:rounded-none! *:border-0! [&>*:not(:last-child)]:border-r!">
                    {renderVisitorActions()}
                  </InputGroup>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Overview */}
            <div className="bg-card dark:bg-card/35 border rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t("details.overview")}
                </h2>
              </div>
              <div className="p-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {t("details.publishedAt")}
                    </p>
                    <p className="font-semibold">
                      {formatDateLong(jobOffer._creationTime, locale)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {t("details.jobType")}
                    </p>
                    <Badge variant="secondary" className="font-semibold">
                      {t(
                        `labels.jobTypes.${jobOffer.type}` as Parameters<
                          typeof t
                        >[0],
                      ) ?? jobOffer.type}
                    </Badge>
                  </div>

                  {jobOffer.salary !== undefined && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {t("details.salary")}
                      </p>
                      <div className="flex items-baseline gap-0.5">
                        <SalaryDisplay salary={jobOffer.salary} />
                        {jobOffer.salaryPeriod && (
                          <span className="text-primary text-xs font-normal">
                            /
                            {t(
                              `labels.salaryPeriods.${jobOffer.salaryPeriod}` as Parameters<
                                typeof t
                              >[0],
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {jobOffer.workMode && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {t("details.workMode")}
                      </p>
                      <p className="font-semibold">
                        {t(
                          `labels.workModes.${jobOffer.workMode}` as Parameters<
                            typeof t
                          >[0],
                        )}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {t("details.location")}
                    </p>
                    <p className="font-semibold"> {locationLabel}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {t("details.contract")}
                    </p>
                    <Badge variant="outline" className="font-semibold">
                      {contractLabelKeys(jobOffer)
                      .map((key) => t(key as Parameters<typeof t>[0]))
                      .join(" · ")}
                    </Badge>
                  </div>

                  {jobOffer.sector && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {t("details.sector")}
                      </p>
                      <p className="font-semibold">{jobOffer.sector}</p>
                    </div>
                  )}

                  {jobOffer.duration && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {t("details.duration")}
                      </p>
                      <p className="font-semibold">{jobOffer.duration}</p>
                    </div>
                  )}

                  {jobOffer.startDate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {t("details.startDate")}
                      </p>
                      <p className="font-semibold">
                        {formatStoredDate(jobOffer.startDate)}
                      </p>
                    </div>
                  )}

                  {jobOffer.weeklyHours !== undefined && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {t("details.weeklyHours")}
                      </p>
                      <p className="font-semibold">
                        {t("details.hoursPerWeek", {
                          hours: jobOffer.weeklyHours,
                        })}
                      </p>
                    </div>
                  )}

                  {jobOffer.applicationDeadline && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {t("details.applicationDeadline")}
                      </p>
                      <p className="font-semibold">
                        {formatStoredDate(jobOffer.applicationDeadline)}
                      </p>
                    </div>
                  )}

                  {jobOffer.trainingRequirements && (
                    <div className="space-y-1 sm:col-span-2">
                      <p className="text-sm text-muted-foreground">
                        {t("details.trainingRequirements")}
                      </p>
                      <p className="font-semibold">
                        {jobOffer.trainingRequirements}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div className="bg-card dark:bg-card/35 border rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">
                  {t("details.description")}
                </h2>
              </div>
              <div className="p-4">
                <div className="prose prose-sm mb-4 max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                    {description}
                  </ReactMarkdown>
                </div>
                <TranslateMenu
                  activeLang={activeLang}
                  pendingLang={pendingLang}
                  onTranslateAction={handleTranslate}
                  onResetAction={reset}
                />
              </div>
            </div>

            {jobOffer.benefits && (
              <div className="bg-card dark:bg-card/35 border rounded-lg shadow-sm">
                <div className="p-4 border-b">
                  <h2 className="text-xl font-semibold">
                    {t("details.benefits")}
                  </h2>
                </div>
                <div className="p-4 whitespace-pre-wrap">
                  {jobOffer.benefits}
                </div>
              </div>
            )}

            {jobOffer.location && jobOffer.workMode !== "remote" && (
              <LocationMap
                location={jobOffer.location}
                city={city}
                approximate
              />
            )}

            {/* Certificates */}
            {jobOffer.certificates && jobOffer.certificates.length > 0 && (
              <div className="bg-card dark:bg-card/35 border rounded-lg shadow-sm">
                <div className="p-4 border-b">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    {t("details.certificates")}
                  </h2>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {jobOffer.certificates.map((cert, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-sm"
                      >
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-card dark:bg-card/35 border rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">
                  {t("details.companyInfo")}
                </h2>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="font-semibold text-lg">
                      {jobOffer.company || t("details.companyName")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {locationLabel}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Summary */}
            <div className="bg-muted/30 border rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">
                  {t("details.quickSummary")}
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary" className="font-semibold">
                    {t(
                      `labels.jobTypes.${jobOffer.type}` as Parameters<
                        typeof t
                      >[0],
                    ) ?? jobOffer.type}
                  </Badge>
                  <div className="flex items-center text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">
                    <Briefcase className="w-4 h-4 mr-1.5" />
                    <span className="font-semibold text-sm">
                      {contractLabelKeys(jobOffer)
                      .map((key) => t(key as Parameters<typeof t>[0]))
                      .join(" · ")}
                    </span>
                  </div>
                  <div className="flex items-center text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">
                    <MapPin className="w-4 h-4 mr-1.5" />
                    <span className="font-semibold text-sm">
                      {locationLabel}
                    </span>
                  </div>
                </div>

                {jobOffer.duration && (
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-sm text-muted-foreground">
                      {t("details.duration")}
                    </span>
                    <span className="font-semibold text-sm">
                      {jobOffer.duration}
                    </span>
                  </div>
                )}

                {jobOffer.salary !== undefined && (
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-sm text-muted-foreground">
                      {t("details.salary")}
                    </span>
                    <div className="flex items-baseline gap-0.5">
                      <SalaryDisplay salary={jobOffer.salary} />
                      {jobOffer.salaryPeriod && (
                        <span className="text-primary text-xs font-normal">
                          /
                          {t(
                            `labels.salaryPeriods.${jobOffer.salaryPeriod}` as Parameters<
                              typeof t
                            >[0],
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-muted-foreground">
                    {t("details.published")}
                  </span>
                  <span className="font-semibold text-sm">
                    {getRelativeTime(jobOffer._creationTime, timeT)}
                  </span>
                </div>
              </div>
            </div>

            {isAuthor && (
              <PublicationStats resource={{ type: "job", id: jobOffer._id }} />
            )}
            {isAuthor && <ReceivedApplications jobId={jobOffer._id} />}

            {/* Apply CTA */}

            {actionsReady && !isAuthor && (
              <div className="hidden bg-primary text-primary-foreground border rounded-lg shadow-sm sm:block">
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">
                    {t("details.readyToApply")}
                  </h3>
                  <p className="text-sm text-primary-foreground/90 mb-4">
                    {t("details.dontMiss")}
                  </p>
                  {applicationEmailStatus === "failed" ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      size="lg"
                      disabled={isRetryingApplicationEmail}
                      onClick={handleApplicationEmailRetry}
                    >
                      {isRetryingApplicationEmail
                        ? t("details.applicationDeliveryRetrying")
                        : t("details.applicationDeliveryRetry")}
                    </Button>
                  ) : !isAcceptingApplications ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      size="lg"
                      disabled
                    >
                      {t("details.closed")}
                    </Button>
                  ) : !isAuthenticated ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      size="lg"
                      onClick={requireAuthentication}
                    >
                      {t("details.applyNow")}
                    </Button>
                  ) : applicationEmailStatus === undefined ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      size="lg"
                      disabled
                    >
                      {t("details.applyNow")}
                    </Button>
                  ) : applicationEmailStatus !== "none" ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      size="lg"
                      disabled
                    >
                      {t("details.alreadyApplied")}
                    </Button>
                  ) : (
                    <ApplyJobDialog jobOffer={jobOffer}>
                      <Button
                        variant="secondary"
                        className="w-full"
                        size="lg"
                        disabled={
                          applicationEmailStatus === undefined || quotaReached
                        }
                      >
                        {t("details.applyNow")}
                      </Button>
                    </ApplyJobDialog>
                  )}
                  {isAcceptingApplications &&
                    applicationEmailStatus === "none" && (
                      <ApplicationQuotaNotice className="mt-2" />
                    )}
                  {isAcceptingApplications && externalApplicationUrl && (
                    <Button
                      asChild
                      variant="outline"
                      className="mt-3 w-full bg-transparent"
                      size="lg"
                    >
                      <a
                        href={externalApplicationUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("details.applyExternally")}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back to jobs link */}
        <div className="mt-12 text-center">
          <Button variant="outline" asChild>
            <Link href="/jobs" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t("details.backToList")}
            </Link>
          </Button>
        </div>
      </div>

      {showMobileApplicationBar && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.45)] backdrop-blur-md sm:hidden">
          {renderApplicationAction("mx-auto w-full max-w-xl")}
        </div>
      )}
    </div>
  );
}
