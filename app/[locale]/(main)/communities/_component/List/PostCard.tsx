import { ShareButton } from "@/components/ShareButton";
import { TranslateMenu } from "@/components/translate-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
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
import { ChevronRight, MessageSquare } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { LikeButton } from "../likeButton";
import { PostBookmarkButton } from "./PostBookmarkButton";
import { Post } from "./types";

export function PostCard({
  post,
  onLike,
}: {
  post: Post;
  onLike: (id: Id<"posts">) => void;
}) {
  const timeT = useTimeTranslations();
  const { isAuthenticated } = useConvexAuth();
  const requireAuthentication = useAuthRequiredAction();
  const te = useTranslations("common");
  const tc = useTranslations("communities");
  const locale = useLocale();
  const postHref = post.communitySlug
    ? `/communities/${post.communitySlug}/${post.slug}`
    : `/posts/${post.slug}`;

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
        onError: () => toast.error(te("translateError")),
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
    <div className="block px-4 py-4 hover:bg-muted/30 transition-colors border-b border-border bg-background max-w-4xl mx-auto">
      <div className="flex sm:flex-row flex-col text-xs text-muted-foreground mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {post.author.slug ? (
            <Link
              href={`/hl/${post.author.slug}`}
              className="flex items-center gap-2 group/author"
            >
              <Avatar className="size-7">
                <AvatarImage src={post.author.image || "/random-user.png"} />
                <AvatarFallback className="text-xs">
                  {post.authorName?.slice(0, 2)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-foreground/80 group-hover/author:text-foreground group-hover/author:underline">
                {post.authorName}
              </span>
            </Link>
          ) : (
            <span className="flex items-center gap-2 text-foreground/80">
              <Avatar className="size-7">
                <AvatarImage src={post.author.image || "/random-user.png"} />
                <AvatarFallback className="text-xs">
                  {post.authorName?.slice(0, 2)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {post.authorName}
            </span>
          )}
          <ChevronRight className="size-3 text-muted-foreground/50" />
          {post.communitySlug && post.communityName ? (
            <Link
              href={`/communities/${post.communitySlug}`}
              className="text-primary font-medium hover:underline"
            >
              {post.communityName}
            </Link>
          ) : (
            <span className="font-medium">{tc("publicPost")}</span>
          )}
        </div>
      </div>

      <Link href={postHref} className="block group">
        <h2 className="font-bold text-foreground text-xl leading-snug group-hover:underline">
          {title}
        </h2>
        {content && (
          <p className="text-sm text-foreground/70 line-clamp-6 mt-1 whitespace-pre-wrap">
            {content}
          </p>
        )}
        <span className="block text-xs text-muted-foreground mt-1.5">
          {getRelativeTime(post._creationTime, timeT)}
        </span>
      </Link>

      <div className="flex items-center gap-1 mt-2">
        <Link
          href={`${postHref}#comments`}
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

        <LikeButton
          initialCount={post.likesCount ?? 0}
          onLike={() => onLike(post._id)}
          initialIsLiked={post.userHasLiked}
        />

        <ShareButton
          url={`/${locale}${postHref}`}
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
    </div>
  );
}
