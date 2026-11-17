"use client";

import { Button } from "@/components/ui/button";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import clsx from "clsx";
import { usePaginatedQuery } from "convex-helpers/react/cache";
import { useConvexAuth, useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { CreatePostDialog } from "../../_component/dialogs/createPostDialog";
import { CommunityPostCard } from "./communitypostcard";

interface CommunityPostListProps {
  communitySlug: string;
  communityId: Id<"communities">;
  communityName?: string;
  isMember: boolean;
}

export function CommunityPostList({
  communitySlug,
  communityId,
  communityName,
  isMember,
}: CommunityPostListProps) {
  const { isAuthenticated } = useConvexAuth();
  const t = useTranslations("communities.community");

  const { results, status, loadMore } = usePaginatedQuery(
    api.communities.queries.getCommunityPosts,
    { communitySlug },
    { initialNumItems: 10 },
  );

  const likePost = useMutation(api.posts.likes.mutations.likePost);

  const handleLike = async (postId: Id<"posts">) => {
    await likePost({ postId });
  };

  const isLoading = status === "LoadingFirstPage";

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16 bg-background rounded-xl">
        <p className="text-muted-foreground mb-4">{t("emptyPosts")}</p>
        {isAuthenticated && isMember && (
          <CreatePostDialog
            communityId={communityId}
            communityName={communityName}
            trigger={
              <span className="text-primary hover:underline cursor-pointer text-sm">
                {t("firstToPost")}
              </span>
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {results.map((post) => (
        <CommunityPostCard
          key={post._id}
          post={post}
          communitySlug={communitySlug}
          onLikeAction={handleLike}
        />
      ))}

      {status !== "Exhausted" && (
        <Button
          variant="outline"
          onClick={() => loadMore(10)}
          className={clsx("mx-auto flex items-center mt-5 mb-5", {
            "cursor-not-allowed opacity-50": status !== "CanLoadMore",
          })}
          disabled={status !== "CanLoadMore"}
        >
          {status === "LoadingMore" ? t("loading") : t("loadMore")}
        </Button>
      )}
    </div>
  );
}
