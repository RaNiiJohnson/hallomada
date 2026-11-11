"use client";

import { ShareButton } from "@/components/ShareButton";
import { ReportDialog } from "@/components/report-dialog";
import { TranslateMenu } from "@/components/translate-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getFreshTranslation,
  getSupportedTranslationLanguage,
  useManualTranslate,
} from "@/hooks/use-manual-translate";
import { useAuthRequiredAction } from "@/hooks/use-auth-required-action";
import { useTimeTranslations } from "@/hooks/use-time-translations";
import { Link, useRouter } from "@/i18n/navigation";
import { getRelativeTime } from "@/lib/date";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import {
  useAction,
  useConvex,
  useConvexAuth,
  useMutation,
} from "convex/react";
import {
  ChevronRight,
  Loader2,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CommentItem } from "../../_component/commentItem";
import { DeleteConfirmDialog } from "../../_component/deleteConfirmDialog";
import { LikeButton } from "../../_component/likeButton";
import { PostBookmarkButton } from "../../_component/List/PostBookmarkButton";
import SkeletonPost from "./skeleton";

export default function PostClient() {
  const { postSlug } = useParams();
  const router = useRouter();
  const post = useQuery(api.posts.queries.getPostWithMeta, {
    slug: postSlug as string,
  });
  const me = useQuery(api.communities.queries.getMe);
  const likePost = useMutation(api.posts.likes.mutations.likePost);
  const addComment = useMutation(api.posts.comments.mutations.addComment);
  const updatePost = useMutation(api.posts.mutations.updatePost);
  const deletePost = useAction(api.posts.actions.deletePost);
  const { isAuthenticated } = useConvexAuth();
  const requireAuthentication = useAuthRequiredAction();

  const [commentContent, setCommentContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post edit state
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editPostContent, setEditPostContent] = useState("");
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const timeT = useTimeTranslations();
  const t = useTranslations("communities.post");
  const te = useTranslations("common");
  const locale = useLocale();

  // const translated = useTranslatedPost(post);

  const translatePost = useAction(api.posts.translate.translatePost);
  const convex = useConvex();
  const translationLanguage = getSupportedTranslationLanguage(locale);
  const cachedTranslation = useQuery(
    api.posts.translate.getTranslation,
    post && translationLanguage
      ? { postId: post._id, language: translationLanguage }
      : "skip",
  );
  const cached = getFreshTranslation(
    cachedTranslation,
    post ? (post.updatedAt ?? post._creationTime) : undefined,
  );

  const { data, activeLang, pendingLang, selectTranslation, reset } =
    useManualTranslate(
      (lang) => {
        if (!post) throw new Error("Post not loaded");
        return translatePost({ postId: post._id, targetLanguage: lang });
      },
      {
        onError: () => toast.error(te("translateError")),
        initialTranslation:
          cached && translationLanguage
            ? { lang: translationLanguage, data: cached }
            : null,
        loadCached: async (lang) => {
          if (!post) return null;
          return getFreshTranslation(
            await convex.query(api.posts.translate.getTranslation, {
              postId: post._id,
              language: lang,
            }),
            post.updatedAt ?? post._creationTime,
          );
        },
      },
    );

  if (post === undefined) {
    return <SkeletonPost />;
  }

  if (post === null) {
    return <p className="text-muted-foreground p-8">{t("notFound")}</p>;
  }

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

  const currentUserId = me?._id;
  const isPostOwner = currentUserId && post.authorId === currentUserId;

  const handleLikePost = async () => {
    await likePost({ postId: post._id });
  };

  const handleComment = async () => {
    if (!commentContent.trim()) return;
    setIsSubmitting(true);
    try {
      await addComment({ postId: post._id, content: commentContent });
      setCommentContent("");
      toast.success(t("commentAdded"));
    } catch {
      toast.error(t("commentError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditPost = () => {
    setEditTitle(post.title);
    setEditPostContent(post.content ?? "");
    setIsEditingPost(true);
  };

  const handleCancelEditPost = () => {
    setIsEditingPost(false);
    setEditTitle("");
    setEditPostContent("");
  };

  const handleSavePost = async () => {
    if (!editTitle.trim()) return;
    setIsSavingPost(true);
    try {
      await updatePost({
        postId: post._id,
        title: editTitle,
        content: editPostContent,
      });
      setIsEditingPost(false);
      toast.success(t("postUpdated"));
    } catch {
      toast.error(t("updateError"));
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleDeletePost = async () => {
    setIsDeletingPost(true);
    try {
      await deletePost({ postId: post._id });
      toast.success(t("postDeleted"));
      router.push(
        post.communitySlug ? `/communities/${post.communitySlug}` : "/communities",
      );
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setIsDeletingPost(false);
    }
  };

  const validComments = post.comments?.filter(Boolean) ?? [];
  const communityHref = post.communitySlug
    ? `/communities/${post.communitySlug}`
    : "/communities";

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-3xl mx-auto px-4 flex items-center gap-2 text-sm text-muted-foreground mb-2 sm:mb-4 pt-2 sm:pt-8">
        <Link
          href="/communities"
          className="hover:text-foreground transition-colors"
        >
          {t("breadcrumbs")}
        </Link>
        <span>
          <ChevronRight className="w-4 h-4" />
        </span>
        <Link
          href={communityHref}
          className="hover:text-foreground transition-colors"
        >
          ...
        </Link>
        <span>
          <ChevronRight className="w-4 h-4" />
        </span>
        <span className="text-foreground font-medium line-clamp-1">
          {title}
        </span>
      </div>
      <div className="max-w-3xl mx-auto py-2 space-y-4">
        {/* Post */}
        <article className="border-b border-border bg-background px-4 py-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <span className="text-primary hover:underline cursor-pointer">
              {post.authorName}
            </span>
            • <span>{getRelativeTime(post._creationTime, timeT)}</span>
          </p>

          {isEditingPost ? (
            <div className="space-y-3 mb-4">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-bold"
                placeholder={t("editTitlePlaceholder")}
                autoFocus
              />
              <Textarea
                value={editPostContent}
                onChange={(e) => setEditPostContent(e.target.value)}
                rows={5}
                className="resize-none text-sm"
                placeholder={t("editContentPlaceholder")}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSavePost}
                  disabled={isSavingPost || !editTitle.trim()}
                >
                  {isSavingPost ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      {t("saving")}
                    </>
                  ) : (
                    t("save")
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEditPost}
                >
                  {t("cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-foreground mb-1">
                {title}
              </h1>

              {post.content && (
                <p className="text-sm text-foreground leading-relaxed mb-2 whitespace-pre-wrap">
                  {content}
                </p>
              )}
            </>
          )}

          {/* Actions post */}
          <div className="flex items-center gap-1 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="group flex items-center gap-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors h-8 px-2"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("comments")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <MessageSquare
                size={15}
                className="transition-transform group-active:scale-95"
              />
              <span className="text-xs font-medium">
                {post.commentsCount ?? 0}
              </span>
            </Button>

            <LikeButton
              initialCount={post.likesCount ?? 0}
              onLike={handleLikePost}
              initialIsLiked={post.userHasLiked}
            />

            <ShareButton
              text={post.title}
              url={typeof window !== "undefined" ? window.location.href : ""}
              variant="ghost"
              className="group flex items-center gap-1.5 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 transition-colors h-8 px-2"
            />

            <PostBookmarkButton
              postId={post._id}
              initialBookmark={post.isBookmarked}
            />

            {me !== undefined && !isPostOwner ? (
              <ReportDialog
                target={{ type: "post", id: post._id }}
                showLabel={false}
                size="icon-sm"
              />
            ) : null}

            {/* Post edit/delete — only for author */}
            {isPostOwner && !isEditingPost && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-8 px-2"
                  onClick={handleStartEditPost}
                >
                  <Pencil size={15} />
                </Button>

                <DeleteConfirmDialog
                  title={t("deleteTitle")}
                  description={t("deleteDescription")}
                  onConfirm={handleDeletePost}
                  isPending={isDeletingPost}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive h-8 px-2"
                    >
                      <Trash2 size={15} />
                    </Button>
                  }
                />
              </>
            )}

            {/* Translation toggle (original / traduit) */}
            {/*{!isEditingPost && (
              <div className="ml-auto">
                <TranslationToggle
                  isTranslating={translated.isTranslating}
                  showOriginal={translated.showOriginal}
                  onToggleAction={translated.toggleOriginal}
                />
              </div>
            )}*/}

            <TranslateMenu
              activeLang={activeLang}
              pendingLang={pendingLang}
              onTranslateAction={handleTranslate}
              onResetAction={reset}
            />
          </div>
        </article>

        {/* Ajouter un commentaire */}
        {isAuthenticated && (
          <div className="bg-background px-4 py-2 border-b border-border space-y-3">
            <p className="text-sm font-medium text-foreground">
              {t("addComment")}
            </p>
            <Textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder={t("commentPlaceholder")}
              rows={3}
              className="resize-none text-sm bg-transparent border-border focus-visible:ring-1"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleComment}
                disabled={isSubmitting || !commentContent.trim()}
                size="sm"
                className="rounded-full px-6"
              >
                {isSubmitting ? t("sending") : t("comment")}
              </Button>
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="space-y-0 px-4">
          {validComments.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center">
              <p className="font-bold">{t("noComments")}</p>
              {isAuthenticated && <p>{t("noCommentsDescription")}</p>}
            </div>
          ) : (
            <h2 className="font-bold text-foreground">
              {validComments.length === 1
                ? t("commentsCount", { count: 1 })
                : t("commentsCountPlural", { count: validComments.length })}
            </h2>
          )}
          {validComments.map((comment) => (
            <CommentItem
              key={comment!._id}
              comment={comment}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
