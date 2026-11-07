"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTimeTranslations } from "@/hooks/use-time-translations";
import { Link, useRouter } from "@/i18n/navigation";
import { getRelativeTime } from "@/lib/date";
import { api } from "@convex/_generated/api";
import { usePaginatedQuery, useQuery } from "convex-helpers/react/cache";
import { useConvexAuth, useMutation } from "convex/react";
import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  FileText,
  FolderLock,
  Heart,
  Store,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RentalFilePanel } from "./rental-file-panel";

const validTabs = [
  "favorites",
  "publications",
  "communities",
  "applications",
  "notifications",
  "dossier",
  "profile",
] as const;

type Tab = (typeof validTabs)[number];

const tabs = [
  ["favorites", Heart],
  ["publications", FileText],
  ["communities", UsersRound],
  ["applications", BriefcaseBusiness],
  ["notifications", Bell],
  ["dossier", FolderLock],
  ["profile", UserRound],
] as const;

const layoutClassName =
  "lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8";

const tabTriggerClassName =
  "justify-start h-14 min-w-0 flex-col gap-1 overflow-hidden rounded-lg border-0 bg-transparent px-1.5 py-2 text-[11px] leading-tight whitespace-normal shadow-none after:hidden " +
  "data-[state=active]:!bg-primary/10 data-[state=active]:!shadow-none data-[state=active]:text-primary " +
  "sm:h-12 sm:flex-row sm:gap-1.5 sm:px-2 sm:text-xs " +
  "lg:h-12 lg:w-full lg:flex-none lg:rounded-full lg:px-4 lg:text-sm";

function isTab(value: string | null): value is Tab {
  return validTabs.some((tab) => tab === value);
}

function LoadMore({
  canLoad,
  loadMore,
  label,
}: {
  canLoad: boolean;
  loadMore: () => void;
  label: string;
}) {
  return canLoad ? (
    <Button variant="outline" className="mt-5" onClick={loadMore}>
      {label}
    </Button>
  ) : null;
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed bg-card/40 p-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-2xl border bg-card p-4"
        >
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 max-w-sm" />
            <Skeleton className="h-3 w-1/2 max-w-56" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CompactListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="space-y-2 rounded-lg px-2 py-1.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      ))}
    </div>
  );
}

export function PersonalSpaceSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 space-y-3 sm:mb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className={layoutClassName}>
        <div className="mb-6 grid grid-cols-3 gap-1 lg:mb-0 lg:flex lg:flex-col lg:gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl sm:h-12" />
          ))}
        </div>
        <ListSkeleton />
      </div>
    </div>
  );
}

function FavoritesPanel() {
  const t = useTranslations("me.favorites");
  const { results, status, loadMore } = usePaginatedQuery(
    api.bookmarks.queries.getMyBookmarks,
    {},
    { initialNumItems: 12 },
  );

  if (status === "LoadingFirstPage") return <ListSkeleton />;
  if (results.length === 0) return <Empty>{t("empty")}</Empty>;

  return (
    <div className="space-y-3">
      {results.map((bookmark) =>
        bookmark.snapshot ? (
          <Link
            key={bookmark._id}
            href={bookmark.snapshot.href}
            className="group flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent/30"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bookmark className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {bookmark.snapshot.title}
              </span>
              {bookmark.snapshot.subtitle && (
                <span className="block truncate text-sm text-muted-foreground">
                  {bookmark.snapshot.subtitle}
                </span>
              )}
            </span>
          </Link>
        ) : (
          <Link
            key={bookmark._id}
            href={`/me/saved/${bookmark._id}`}
            className="flex items-center gap-4 rounded-2xl border border-dashed bg-card/40 p-4 text-sm text-muted-foreground transition-colors hover:border-primary/50"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Bookmark className="size-4" />
            </span>
            {t("legacy", { type: t(`types.${bookmark.resourceType}`) })}
          </Link>
        ),
      )}
      <LoadMore
        canLoad={status === "CanLoadMore"}
        loadMore={() => loadMore(12)}
        label={t("loadMore")}
      />
    </div>
  );
}

function PublicationsPanel() {
  const t = useTranslations("me.publications");
  const jobs = usePaginatedQuery(
    api.me.queries.getMyJobOffers,
    {},
    { initialNumItems: 6 },
  );
  const listings = usePaginatedQuery(
    api.me.queries.getMyListings,
    {},
    { initialNumItems: 6 },
  );
  const providers = usePaginatedQuery(
    api.me.queries.getMyProviders,
    {},
    { initialNumItems: 6 },
  );
  const posts = usePaginatedQuery(
    api.me.queries.getMyPosts,
    {},
    { initialNumItems: 6 },
  );
  const groups = [
    {
      title: t("jobs"),
      icon: BriefcaseBusiness,
      items: jobs.results.map((item) => ({
        _id: item._id,
        title: item.title,
        href: `/jobs/${item.slug}`,
        status: item.status ?? "active",
      })),
      status: jobs.status,
      loadMore: jobs.loadMore,
    },
    {
      title: t("listings"),
      icon: Building2,
      items: listings.results.map((item) => ({
        _id: item._id,
        title: item.title,
        href: `/listing/${item.slug}`,
        status: item.status ?? "active",
      })),
      status: listings.status,
      loadMore: listings.loadMore,
    },
    {
      title: t("providers"),
      icon: Store,
      items: providers.results.map((item) => ({
        _id: item._id,
        title: item.name,
        href: `/providers/${item.slug}`,
        status: item.status,
      })),
      status: providers.status,
      loadMore: providers.loadMore,
    },
    {
      title: t("posts"),
      icon: FileText,
      items: posts.results.map((item) => ({
        _id: item._id,
        title: item.title,
        href: item.communitySlug
          ? `/communities/${item.communitySlug}/${item.slug}`
          : `/posts/${item.slug}`,
        status: null,
      })),
      status: posts.status,
      loadMore: posts.loadMore,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {groups.map((group) => {
        const Icon = group.icon;
        return (
          <section
            key={group.title}
            className="min-w-0 rounded-xl border bg-card p-4"
          >
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Icon className="size-4 text-primary" />
              {group.title}
            </h2>
            {group.status === "LoadingFirstPage" ? (
              <CompactListSkeleton />
            ) : group.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              <div className="space-y-2">
                {group.items.map((item) => (
                  <Link
                    key={item._id}
                    href={item.href}
                    className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <span className="min-w-0 flex-1 truncate border-b-2 font-medium">
                      {item.title}
                    </span>
                    {item.status ? (
                      <Badge
                        variant={
                          item.status === "active"
                            ? "default"
                            : item.status === "closed"
                              ? "secondary"
                              : "outline"
                        }
                        className="shrink-0"
                      >
                        {t(`statuses.${item.status}`)}
                      </Badge>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
            <LoadMore
              canLoad={group.status === "CanLoadMore"}
              loadMore={() => group.loadMore(6)}
              label={t("loadMore")}
            />
          </section>
        );
      })}
    </div>
  );
}

function CommunitiesPanel() {
  const t = useTranslations("me.communities");
  const { results, status, loadMore } = usePaginatedQuery(
    api.me.queries.getMyCommunities,
    {},
    { initialNumItems: 12 },
  );
  if (status === "LoadingFirstPage") return <ListSkeleton />;
  if (results.length === 0) return <Empty>{t("empty")}</Empty>;
  return (
    <div className="space-y-3">
      {results.map((community) => (
        <Link
          key={community._id}
          href={`/communities/${community.slug}`}
          className="flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
        >
          <UsersRound className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate font-medium">
            {community.name}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">
            {community.role}
          </span>
        </Link>
      ))}
      <LoadMore
        canLoad={status === "CanLoadMore"}
        loadMore={() => loadMore(12)}
        label={t("loadMore")}
      />
    </div>
  );
}

function ApplicationsPanel() {
  const t = useTranslations("me.applications");
  const { results, status, loadMore } = usePaginatedQuery(
    api.me.queries.getMyApplications,
    {},
    { initialNumItems: 12 },
  );
  if (status === "LoadingFirstPage") return <ListSkeleton />;
  if (results.length === 0) return <Empty>{t("empty")}</Empty>;
  return (
    <div className="space-y-3">
      {results.map((application) => (
        <div
          key={application._id}
          className="min-w-0 rounded-2xl border bg-card p-4"
        >
          <p className="wrap-break-word font-medium">
            {application.job?.title ?? t("unavailable")}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {application.job?.company}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t(application.emailStatus)}
          </p>
        </div>
      ))}
      <LoadMore
        canLoad={status === "CanLoadMore"}
        loadMore={() => loadMore(12)}
        label={t("loadMore")}
      />
    </div>
  );
}

function NotificationsPanel() {
  const t = useTranslations("me.notifications");
  const notificationT = useTranslations("notifications");
  const timeT = useTimeTranslations();
  const notifications = usePaginatedQuery(
    api.notifications.queries.getMyNotificationsPage,
    {},
    { initialNumItems: 20 },
  );
  const unreadCount = useQuery(api.notifications.queries.getUnreadCount, {});
  const markAllRead = useMutation(api.notifications.mutations.markAllRead);
  const markOneRead = useMutation(api.notifications.mutations.markOneRead);
  if (notifications.status === "LoadingFirstPage") return <ListSkeleton />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="min-h-11 rounded-full"
          disabled={!unreadCount}
          onClick={() => markAllRead()}
        >
          {t("markAllRead")}
        </Button>
      </div>
      {notifications.results.length === 0 ? (
        <Empty>{t("empty")}</Empty>
      ) : (
        notifications.results.map((notification) => {
          const href = notification.targetHref ?? (notification.communitySlug
            ? notification.postSlug
              ? `/communities/${notification.communitySlug}/${notification.postSlug}`
              : `/communities/${notification.communitySlug}`
            : "/communities");
          return (
            <Link
              key={notification._id}
              href={href}
              onClick={() => {
                if (!notification.read)
                  markOneRead({ notificationId: notification._id });
              }}
              className={`flex min-h-16 min-w-0 items-start gap-3 rounded-2xl border p-4 transition-colors hover:bg-accent/30 ${notification.read ? "bg-card" : "border-primary/50 bg-primary/5"}`}
            >
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.read ? "bg-muted-foreground/30" : "bg-primary"}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block wrap-break-word text-sm">
                  {notificationT(
                    `messages.${notification.type}` as Parameters<
                      typeof notificationT
                    >[0],
                    {
                      name:
                        notification.fromUserName ?? notificationT("someone"),
                      title:
                        notification.message ?? notificationT("content"),
                    },
                  )}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {getRelativeTime(notification._creationTime, timeT)}
                </span>
              </span>
            </Link>
          );
        })
      )}
      <LoadMore
        canLoad={notifications.status === "CanLoadMore"}
        loadMore={() => notifications.loadMore(20)}
        label={t("loadMore")}
      />
    </div>
  );
}

function ProfilePanel() {
  const t = useTranslations("me.profile");
  const user = useQuery(api.auth.auth.getCurrentUser);
  const updateUser = useMutation(api.auth.users.updateUser);
  if (user === undefined) return <ListSkeleton rows={2} />;
  if (user === null) return null;
  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("privateCv")}</p>
      </div>
      <div className="flex items-center justify-between gap-4 border-y py-5">
        <div className="min-w-0">
          <p className="font-medium">{t("profileVisibility")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("profileVisibilityHint")}
          </p>
        </div>
        <Switch
          className="shrink-0"
          aria-label={t("profileVisibility")}
          checked={user.isPublic !== false}
          onCheckedChange={(isPublic) => updateUser({ patch: { isPublic } })}
        />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button className="min-h-11 rounded-full" asChild>
          <Link href={`/hl/${user.slug}`}>{t("editProfile")}</Link>
        </Button>
        <Button className="min-h-11 rounded-full" variant="outline" asChild>
          <Link href={`/hl/${user.slug}`}>{t("publicProfile")}</Link>
        </Button>
      </div>
    </section>
  );
}

export function PersonalSpace() {
  const t = useTranslations("me");
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDesktop, setIsDesktop] = useState(false);
  const tabFromUrl = searchParams.get("tab");
  const selected: Tab = isTab(tabFromUrl) ? tabFromUrl : "favorites";

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const updateOrientation = () => setIsDesktop(query.matches);
    updateOrientation();
    query.addEventListener("change", updateOrientation);
    return () => query.removeEventListener("change", updateOrientation);
  }, []);

  // La redirection non connecté -> /login est gérée côté serveur dans page.tsx.
  // Ici on attend seulement que le token Convex soit prêt avant de lancer les requêtes.
  if (isLoading || !isAuthenticated) return <PersonalSpaceSkeleton />;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t("description")}
        </p>
      </header>

      <Tabs
        value={selected}
        orientation={isDesktop ? "vertical" : "horizontal"}
        onValueChange={(tab) =>
          router.replace(`/me?tab=${tab}`, { scroll: false })
        }
        className={layoutClassName}
      >
        <TabsList
          variant="line"
          className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-border/60 bg-card p-1 group-data-[orientation=horizontal]/tabs:h-auto! data-[variant=line]:rounded-2xl lg:sticky lg:top-24 lg:flex lg:h-auto lg:flex-col lg:gap-4 lg:rounded-none lg:border-0 lg:border-l-2 lg:bg-transparent lg:p-0 lg:pl-2 lg:data-[variant=line]:rounded-none"
        >
          {tabs.map(([value, Icon]) => (
            <TabsTrigger
              key={value}
              className={tabTriggerClassName}
              value={value}
            >
              <Icon />
              <span className="truncate">{t(`tabs.${value}`)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6 min-w-0 lg:mt-0">
          <TabsContent value="favorites">
            <FavoritesPanel />
          </TabsContent>
          <TabsContent value="publications">
            <PublicationsPanel />
          </TabsContent>
          <TabsContent value="communities">
            <CommunitiesPanel />
          </TabsContent>
          <TabsContent value="applications">
            <ApplicationsPanel />
          </TabsContent>
          <TabsContent value="notifications">
            <NotificationsPanel />
          </TabsContent>
          <TabsContent value="dossier">
            <RentalFilePanel />
          </TabsContent>
          <TabsContent value="profile">
            <ProfilePanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
