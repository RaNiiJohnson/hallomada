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

interface PostBookmarkButtonProps {
  postId: Id<"posts">;
  initialBookmark?: boolean;
  className?: string;
}

export const PostBookmarkButton = ({
  postId,
  initialBookmark = false,
  className,
}: PostBookmarkButtonProps) => {
  const { isAuthenticated } = useConvexAuth();
  const requireAuthentication = useAuthRequiredAction();
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
          resourceId: postId,
          resourceType: "post",
        });
        toast.success(newState ? "Post enregistré" : "Post retiré des favoris");
      } catch {
        toast.error("Une erreur est survenue");
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "group flex items-center gap-1.5 transition-colors h-8 px-2",
        optimisticIsBookmarked
          ? "text-blue-500 hover:bg-blue-500/20"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
        className,
      )}
      onClick={isAuthenticated ? handleToggle : requireAuthentication}
    >
      <Bookmark
        size={15}
        className={cn(
          "transition-transform group-active:scale-95",
          optimisticIsBookmarked && "fill-current",
        )}
      />
      <span className="sr-only">
        {optimisticIsBookmarked ? "Retirer des favoris" : "Ajouter aux favoris"}
      </span>
    </Button>
  );
};
