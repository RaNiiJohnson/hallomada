"use client";

import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { useConvexAuth } from "convex/react";

export function LikeButton({
  initialCount,
  initialIsLiked = false,
  onLike,
}: {
  initialCount: number;
  initialIsLiked?: boolean;
  onLike: () => Promise<unknown> | void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const [optimistic, setOptimistic] = useOptimistic(
    { count: initialCount, isLiked: initialIsLiked },
    (_, newState: { count: number; isLiked: boolean }) => newState,
  );
  const [, startTransition] = useTransition();

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newIsLiked = !optimistic.isLiked;
    const newCount = optimistic.count + (newIsLiked ? 1 : -1);

    startTransition(async () => {
      setOptimistic({ count: newCount, isLiked: newIsLiked });
      try {
        await onLike();
      } catch (error) {
        console.error("Like error:", error);
        toast.error("Une erreur est survenue");
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`group flex items-center gap-1.5 transition-colors h-8 px-2 ${
        optimistic.isLiked
          ? "text-green-500 hover:bg-green-500/20"
          : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
      }`}
      onClick={handleLike}
      disabled={!isAuthenticated}
    >
      <CheckIcon
        size={15}
        className="transition-transform group-active:scale-95"
      />
      <span className="text-xs font-medium">{optimistic.count}</span>
    </Button>
  );
}
