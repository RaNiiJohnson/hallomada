"use client";

import { ShareButton } from "@/components/ShareButton";
import { TranslateMenu } from "@/components/translate-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  getFreshTranslation,
  getSupportedTranslationLanguage,
  useManualTranslate,
} from "@/hooks/use-manual-translate";
import { useAuthRequiredAction } from "@/hooks/use-auth-required-action";
import { useTimeTranslations } from "@/hooks/use-time-translations";
import { Link } from "@/i18n/navigation";
import { getRelativeTime } from "@/lib/date";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex-helpers/react/cache";
import { useAction, useConvex, useConvexAuth } from "convex/react";
import { CheckIcon, MessageSquare } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { PostBookmarkButton } from "../../_component/List/PostBookmarkButton";

type CommunityPost = {
  _id: Id<"posts">;
  slug: string;
  title: string;
  content?: string;
  authorName?: string;
  _creationTime: number;
  commentsCount?: number;
  likesCount?: number;
  userHasLiked?: boolean;
  isBookmarked?: boolean;
  updatedAt?: number;
};

export function CommunityPostCard({
  post,
  communitySlug,
  onLikeAction,
}: {
  post: CommunityPost;
  communitySlug: string;
  onLikeAction: (postId: Id<"posts">) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const requireAuthentication = useAuthRequiredAction();
  const timeT = useTimeTranslations();
  const t = useTranslations("communities.post");
  const locale = useLocale();

  const translatePost = useAction(api.posts.translate.translatePost);
  const convex = useConvex();
  const translationLanguage = getSupportedTranslationLanguage(locale);
  const cachedTranslation = useQuery(
    api.posts.translate.getTranslation,
    translationLanguage
      ? { postId: post._id, language: translationLanguage }
      : "skip",
  );
  const cached = getFreshTranslation(
    cachedTranslation,
    post.updatedAt ?? post._creationTime,
  );
  const { data, activeLang, pendingLang, selectTranslation, reset } =
    useManualTranslate(
      (lang) => translatePost({ postId: post._id, targetLanguage: lang }),
      {
        onError: () => toast.error(t("translateError")),
        initialTranslation:
          cached && translationLanguage
            ? { lang: translationLanguage, data: cached }
            : null,
        loadCached: async (lang) =>
          getFreshTranslation(
            await convex.query(api.posts.translate.getTranslation, {
              postId: post._id,
              language: lang,
            }),
            post.updatedAt ?? post._creationTime,
          ),
      },
    );

  const translation = data;
  const title = translation?.title ?? post.title;
  const content = translation?.content ?? post.content;
  const handleTranslate = (
    language: Parameters<typeof selectTranslation>[0],
  ) =>
    void selectTranslation(language, {
      canCreate: isAuthenticated,
      onCreateRequired: requireAuthentication,
    });

  return (
    <article
      key={post._id}
      className="block px-4 py-4 hover:bg-muted/30 transition-colors border-b border-border bg-background"
    >
      <Link
        href={`/communities/${communitySlug}/${post.slug}`}
        className="block"
      >
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <span className="text-primary hover:underline">
            {post.authorName}
          </span>
          •<span>{getRelativeTime(post._creationTime, timeT)}</span>
        </p>
        <h2 className="font-bold text-foreground text-xl leading-snug mb-1">
          {title}
        </h2>
        {content && (
          <p className="text-sm text-foreground/80 line-clamp-6 mb-2 whitespace-pre-wrap">
            {content}
          </p>
        )}
      </Link>

      <div className="flex items-center gap-1 mt-2">
        <Link
          href={`/communities/${communitySlug}/${post.slug}#comments`}
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className:
              "group flex items-center gap-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors h-8 px-2",
          })}
        >
          <MessageSquare
            size={15}
            className="transition-transform group-active:scale-95"
          />
          <span className="text-xs font-medium">{post.commentsCount ?? 0}</span>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          className={`group flex items-center gap-1.5 transition-colors h-8 px-2 ${
            post.userHasLiked
              ? "text-green-500  hover:bg-green-500/20"
              : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
          }`}
          onClick={(e) => {
            e.preventDefault();
            onLikeAction(post._id);
          }}
          disabled={!isAuthenticated}
        >
          <CheckIcon
            size={15}
            className="transition-transform group-active:scale-95"
          />
          <span className="text-xs font-medium">{post.likesCount ?? 0}</span>
        </Button>

        <ShareButton
          url={`/${locale}/communities/${communitySlug}/${post.slug}`}
          text={post.title}
          variant="ghost"
          className="group flex items-center gap-1.5 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 transition-colors h-8 px-2"
        />

        <PostBookmarkButton
          postId={post._id}
          initialBookmark={post.isBookmarked}
        />

        <TranslateMenu
          activeLang={activeLang}
          pendingLang={pendingLang}
          onTranslateAction={handleTranslate}
          onResetAction={reset}
        />
      </div>
    </article>
  );
}
