"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/components/report-dialog";
import { useAuthRequiredAction } from "@/hooks/use-auth-required-action";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MobileActionsMenu } from "@/components/mobile-actions-menu";
import { Link } from "@/i18n/navigation";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { useAction, useConvexAuth, useMutation } from "convex/react";
import {
  ChevronRight,
  Hash,
  LogOut,
  MapPin,
  Trash,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CreatePostDialog } from "../_component/dialogs/createPostDialog";
import { CommunityPostList } from "./_components/communityPostList";
import SkeletonCommunity from "./skeleton";

export default function CommunityClient() {
  const { communitySlug } = useParams();
  const router = useRouter();

  const community = useQuery(api.communities.queries.getCommunityDetails, {
    slug: communitySlug as string,
  });
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.auth.auth.getCurrentUser);
  const requireAuthentication = useAuthRequiredAction();

  const isMember = useQuery(
    api.communities.queries.isMember,
    community ? { communityId: community._id } : "skip",
  );

  const joinCommunity = useMutation(api.communities.mutations.joinCommunity);
  const leaveCommunity = useMutation(api.communities.mutations.leaveCommunity);
  const deleteCommunity = useAction(api.communities.actions.deleteCommunity);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const t = useTranslations("communities.community");

  if (community === undefined) {
    return <SkeletonCommunity />;
  }

  if (community === null) {
    return <p className="text-muted-foreground p-8">{t("notFound")}</p>;
  }

  const handleJoin = async () => {
    try {
      await joinCommunity({ communityId: community._id });
      toast.success(t("joined", { name: community.name }));
    } catch {
      toast.error(t("joinError"));
    }
  };

  const handleLeave = async () => {
    try {
      await leaveCommunity({ communityId: community._id });
      toast.success(t("left", { name: community.name }));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("error");
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCommunity({ id: community._id });
      toast.success(t("deletedCommunity", { name: community.name }));
      router.push("/communities");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("error");
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const isAdmin = isMember?.role === "admin";
  const canLeave = !!isMember && !isAdmin;
  const canReport =
    currentUser !== undefined && currentUser?._id !== community.authorId;
  const hasMenuActions = canLeave || canReport || isAdmin;

  // Join for visitors and non-members, write a post for members.
  const primaryAction = !isAuthenticated ? (
    <Button size="sm" onClick={requireAuthentication}>
      {t("join")}
    </Button>
  ) : isMember === undefined ? null : isMember ? (
    <CreatePostDialog
      communityId={community._id}
      communityName={community.name}
    />
  ) : (
    <Button size="sm" onClick={handleJoin}>
      {t("join")}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-5 flex items-center gap-2 text-sm text-muted-foreground mb-2 sm:mb-4 pt-2 sm:pt-8">
        <Link
          href="/communities"
          className="hover:text-foreground transition-colors"
        >
          {t("breadcrumbs")}
        </Link>
        <span>
          <ChevronRight className="w-4 h-4" />
        </span>
        <span className="text-foreground font-medium line-clamp-1">
          {community.name}
        </span>
      </div>
      <div className="bg-card border-b border-border max-w-4xl mx-auto">
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0 select-none">
              {community.name.slice(0, 2).toUpperCase()}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Name + badge + desktop actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                      {community.name}
                    </h1>
                    {isAdmin && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-5 px-2 font-semibold tracking-wide shrink-0"
                      >
                        {t("admin").toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users size={11} className="shrink-0" />
                      <span className="font-medium text-foreground">
                        {community.membersCount ?? 0}
                      </span>
                      {t("members", { count: community.membersCount ?? 0 })}
                    </span>
                    <span>·</span>
                    <span>
                      <span className="font-medium text-foreground">
                        {community.postsCount ?? 0}
                      </span>{" "}
                      {t("posts", { count: community.postsCount ?? 0 })}
                    </span>
                    {community.city || community.theme ? (
                      <>
                        <span>·</span>
                        <span
                          className="flex items-center gap-1"
                          title={community.city ? t("cityTag") : t("themeTag")}
                        >
                          {community.city ? (
                            <MapPin size={11} className="shrink-0" />
                          ) : (
                            <Hash size={11} className="shrink-0" />
                          )}
                          {community.city ?? community.theme}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {primaryAction ? (
                    <div className="hidden sm:flex items-center gap-2">
                      {primaryAction}
                    </div>
                  ) : null}
                  {hasMenuActions ? (
                    <MobileActionsMenu mobileOnly={false}>
                      {canLeave ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLeave}
                        >
                          <LogOut />
                          {t("leave")}
                        </Button>
                      ) : null}
                      {canReport ? (
                        <ReportDialog
                          target={{ type: "community", id: community._id }}
                          variant="outline"
                        />
                      ) : null}
                      {isAdmin ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          <Trash />
                          {t("deleteCommunity")}
                        </Button>
                      ) : null}
                    </MobileActionsMenu>
                  ) : null}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {community.description}
              </p>
              {community.rules ? (
                <div className="mt-3 rounded-lg border bg-muted/40 p-3">
                  <h3 className="text-xs font-semibold">{t("rulesTitle")}</h3>
                  <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                    {community.rules}
                  </p>
                </div>
              ) : null}

              {/* Primary action — mobile only (below description) */}
              {primaryAction ? (
                <div className="flex sm:hidden items-center gap-2 mt-3">
                  {primaryAction}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {/* Delete confirmation dialog — rendered once, shared by both breakpoints */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("deleteDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteDialogDescription", { name: community.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="opacity-70">{t("deleting")}</span>
              ) : (
                <>
                  <Trash size={13} className="mr-1.5" />
                  {t("deleteDialogConfirm")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="max-w-4xl mx-auto py-2">
        <CommunityPostList
          communitySlug={community.slug}
          communityId={community._id}
          communityName={community.name}
          isMember={!!isMember}
        />
      </div>
    </div>
  );
}
