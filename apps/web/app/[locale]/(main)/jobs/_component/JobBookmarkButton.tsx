"use client";

import { Button } from "@/components/ui/button";
import { useAuthRequiredAction } from "@/hooks/use-auth-required-action";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useConvexAuth, useMutation } from "convex/react";
import { Bookmark } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface JobBookmarkButtonProps {
  jobId: string;
  initialBookmark?: boolean;
  className?: string;
  showLabel?: boolean;
}

export const JobBookmarkButton = ({
  jobId,
  initialBookmark = false,
  className,
  showLabel = false,
}: JobBookmarkButtonProps) => {
  const { isAuthenticated } = useConvexAuth();
  const requireAuthentication = useAuthRequiredAction();
  const t = useTranslations("jobs.bookmark");
  const [optimisticIsBookmarked, setOptimisticIsBookmarked] = useOptimistic(
    initialBookmark,
    (_, newState: boolean) => newState,
  );

  const toggleBookmark = useMutation(api.bookmarks.mutations.toggleBookmark);
  const [, startTransition] = useTransition();

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newState = !optimisticIsBookmarked;

    startTransition(async () => {
      setOptimisticIsBookmarked(newState);

      try {
        await toggleBookmark({
          resourceId: jobId as Id<"JobOffer">,
          resourceType: "job",
        });
        toast.success(newState ? t("added") : t("removed"));
      } catch {
        toast.error(t("error"));
      }
    });
  };

  return (
    <Button
      variant="secondary"
      size={showLabel ? "sm" : "icon"}
      aria-pressed={optimisticIsBookmarked}
      className={cn(
        showLabel ? "mt-0 h-8 w-auto" : "mt-2 h-8 w-8",
        optimisticIsBookmarked
          ? "bg-primary/15 text-primary hover:bg-primary/20"
          : "text-foreground hover:bg-accent",
        className,
      )}
      onClick={isAuthenticated ? handleToggle : requireAuthentication}
    >
      <Bookmark
        className={cn("w-4 h-4", optimisticIsBookmarked && "fill-current")}
      />
      <span className={showLabel ? undefined : "sr-only"}>
        {optimisticIsBookmarked ? t("removeLabel") : t("addLabel")}
      </span>
    </Button>
  );
};
