"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useWidget } from "@/components/WidgetContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTimeTranslations } from "@/hooks/use-time-translations";
import { Link } from "@/i18n/navigation";
import { getRelativeTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { useConvexAuth, useMutation } from "convex/react";
import { Bell, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

const notificationIcon: Record<string, string> = {
  new_comment: "💬",
  new_reply: "↩️",
  new_like: "✅",
  new_comment_like: "✅",
  new_reply_like: "✅",
  new_member: "👥",
  leave_community: "❌",
  job_approved: "✅",
  job_rejected: "❌",
  listing_approved: "✅",
  listing_rejected: "❌",
  job_pending_review: "🕒",
  listing_pending_review: "🕒",
  provider_approved: "✅",
  provider_rejected: "❌",
  provider_pending_review: "🕒",
  job_contact_bounced: "⚠️",
  rental_file_received: "📁",
};

export function NotificationWidget({
  placement = "floating",
}: {
  placement?: "floating" | "navbar";
}) {
  const { isAuthenticated } = useConvexAuth();
  const { activeWidget, openWidget, closeWidget } = useWidget();
  const timeT = useTimeTranslations();
  const t = useTranslations("notifications");
  const isMobile = useIsMobile();

  const isOpen = activeWidget === "notifications";

  const notifications = useQuery(
    api.notifications.queries.getMyNotifications,
    isAuthenticated ? {} : "skip",
  );

  const unreadCount = useQuery(
    api.notifications.queries.getUnreadCount,
    isAuthenticated ? {} : "skip",
  );

  const markAllRead = useMutation(api.notifications.mutations.markAllRead);
  const markOneRead = useMutation(api.notifications.mutations.markOneRead);

  // History back to close on mobile
  useEffect(() => {
    if (isOpen && isMobile)
      window.history.pushState({ notificationsOpen: true }, "");
    const handlePopState = () => {
      if (isOpen && isMobile) {
        closeWidget("notifications");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isOpen, isMobile, closeWidget]);

  if (!isAuthenticated) return null;

  const handleOpenChange = (open: boolean) => {
    if (open) {
      openWidget("notifications");
    } else {
      closeWidget("notifications");
    }
  };

  const notificationListContent = (
    <div className="flex-1 overflow-y-auto overscroll-contain">
      {!notifications || notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Bell size={32} className="mb-2 opacity-40" />
          <p className="text-sm">{t("empty")}</p>
        </div>
      ) : (
        notifications.map((notif) => {
          const href = notif.targetHref ??
            (notif.communitySlug && notif.postSlug
              ? `/communities/${notif.communitySlug}/${notif.postSlug}`
              : "/communities");

          return (
            <Link
              key={notif._id}
              href={href}
              onClick={() => {
                if (!notif.read) markOneRead({ notificationId: notif._id });
                closeWidget("notifications");
              }}
              className={`flex items-start gap-3.5 px-4 py-3.5 hover:bg-muted/50 transition-colors border-b border-border last:border-0 ${
                !notif.read ? "bg-primary/5" : ""
              }`}
            >
              <span className="text-lg mt-0.5 shrink-0">
                {notificationIcon[notif.type] ?? "🔔"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug wrap-break-word">
                  {t(`messages.${notif.type}` as Parameters<typeof t>[0], {
                    name: notif.fromUserName ?? t("someone"),
                    title: notif.message ?? t("content"),
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {getRelativeTime(notif._creationTime, timeT)}
                </p>
              </div>
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
              )}
            </Link>
          );
        })
      )}
    </div>
  );

  const historyLink = (
    <Link
      href="/me?tab=notifications"
      onClick={() => closeWidget("notifications")}
      className="block border-t border-border px-4 py-3 text-center text-sm font-medium text-primary hover:bg-muted"
    >
      {t("history")}
    </Link>
  );

  return (
    <div
      className={cn(
        placement === "floating" ? "fixed bottom-5 right-5 z-50" : "relative",
      )}
    >
      {isMobile ? (
        <>
          {!isOpen && (
            <button
              onClick={() => openWidget("notifications")}
              aria-label={t("open")}
              className={cn(
                "relative flex items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted",
                placement === "navbar"
                  ? "size-9 bg-transparent"
                  : "size-12 border border-border bg-card shadow-lg",
              )}
            >
              <Bell size={18} />
              {unreadCount != null && unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          )}

          <Sheet
            open={isOpen}
            onOpenChange={(open) => !open && closeWidget("notifications")}
          >
            <SheetContent
              side="bottom"
              className="h-[85vh] p-0 flex flex-col rounded-t-2xl overflow-hidden border-t border-border bg-background"
              showCloseButton={false}
            >
              <SheetTitle className="sr-only">{t("title")}</SheetTitle>
              <SheetDescription className="sr-only">
                {t("description")}
              </SheetDescription>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-card shrink-0">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-foreground" />
                  <span className="text-sm font-semibold text-foreground">
                    {t("title")}
                  </span>
                  {unreadCount != null && unreadCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full font-medium">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {notifications && notifications.length > 0 && (
                    <button
                      onClick={() => markAllRead()}
                      disabled={!unreadCount}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 hover:bg-muted rounded-md disabled:pointer-events-none disabled:opacity-50"
                    >
                      {t("markAllRead")}
                    </button>
                  )}
                  <button
                    onClick={() => closeWidget("notifications")}
                    aria-label={t("close")}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted rounded-md"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>
              {notificationListContent}
              {historyLink}
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button
              aria-label={t("open")}
              className={cn(
                "relative flex items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted",
                placement === "navbar"
                  ? "size-9 bg-transparent"
                  : "size-12 border border-border bg-card shadow-lg",
              )}
            >
              <Bell size={18} />
              {!isOpen && unreadCount != null && unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent
            side="top"
            align="end"
            sideOffset={8}
            className="w-80 p-0 rounded-xl border border-border shadow-xl overflow-hidden max-h-96 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {t("title")}
                </span>
                {unreadCount != null && unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full font-medium">
                    {unreadCount}
                  </span>
                )}
              </div>
              {notifications && notifications.length > 0 && (
                <button
                  onClick={() => markAllRead()}
                  disabled={!unreadCount}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-50"
                >
                  {t("markAllRead")}
                </button>
              )}
            </div>
            {notificationListContent}
            {historyLink}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
