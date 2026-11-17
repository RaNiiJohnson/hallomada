"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTimeTranslations } from "@/hooks/use-time-translations";
import { getRelativeTime } from "@/lib/date";
import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation } from "convex/react";
import { ChevronDown, ChevronUp, Pencil, Reply, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "./deleteConfirmDialog";
import { LikeButton } from "./likeButton";
import { Comment } from "./List/types";
import { ReplyItem } from "./replyItem";

export function CommentItem({
  comment,
  currentUserId,
}: {
  comment: Comment | null;
  currentUserId?: string;
}) {
  const likeComment = useMutation(api.posts.likes.mutations.likeComment);
  const addReply = useMutation(api.posts.comments.mutations.addReply);
  const updateComment = useMutation(api.posts.comments.mutations.updateComment);
  const deleteComment = useMutation(api.posts.comments.mutations.deleteComment);
  const { isAuthenticated } = useConvexAuth();

  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const timeT = useTimeTranslations();
  const t = useTranslations("communities.comment");

  if (!comment) return null;

  const isOwner = currentUserId && comment.authorId === currentUserId;

  const handleLike = async () => {
    await likeComment({ commentId: comment._id });
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      await addReply({ commentId: comment._id, content: replyContent });
      setReplyContent("");
      setShowReplyForm(false);
      setShowReplies(true);
      toast.success(t("replyAdded"));
    } catch {
      toast.error(t("replyError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = () => {
    setEditContent(comment.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    try {
      await updateComment({ commentId: comment._id, content: editContent });
      setIsEditing(false);
      toast.success(t("commentUpdated"));
    } catch {
      toast.error(t("updateError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteComment({ commentId: comment._id });
      toast.success(t("commentDeleted"));
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const validReplies = comment.replies.filter(Boolean);

  return (
    <div className="flex gap-3 py-4 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        {/* Author */}
        <p className="flex items-center gap-1.5 text-xs mb-1">
          <span className="text-primary font-medium hover:underline cursor-pointer">
            {comment.authorName}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {getRelativeTime(comment._creationTime, timeT)}
          </span>
        </p>

        {/* Content / Edit mode */}
        {isEditing ? (
          <div className="space-y-2 mb-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="resize-none text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isSaving || !editContent.trim()}
              >
                {isSaving ? t("saving") : t("save")}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground leading-relaxed mb-2 whitespace-pre-wrap">
            {comment.content}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 -ml-2 flex-wrap">
          <LikeButton
            initialCount={comment.likesCount}
            initialIsLiked={comment.userHasLiked}
            onLike={handleLike}
          />

          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="group flex items-center gap-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors h-8 px-2"
            >
              <Reply
                size={14}
                className="transition-transform group-active:scale-95"
              />
              <span className="text-xs font-medium">{t("reply")}</span>
            </Button>
          )}

          {isOwner && !isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartEdit}
                aria-label={t("edit")}
                className="text-muted-foreground hover:text-foreground h-8 px-2"
              >
                <Pencil size={14} />
              </Button>

              <DeleteConfirmDialog
                title={t("deleteCommentTitle")}
                description={t("deleteCommentDescription")}
                onConfirm={handleDelete}
                isPending={isDeleting}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("delete")}
                    className="text-muted-foreground hover:text-destructive h-8 px-2"
                  >
                    <Trash2 size={14} />
                  </Button>
                }
              />
            </>
          )}

          {validReplies.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors h-8 px-2"
            >
              {showReplies ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
              <span className="text-xs font-medium">
                {validReplies.length === 1
                  ? t("repliesCount", { count: 1 })
                  : t("repliesCountPlural", { count: validReplies.length })}
              </span>
            </Button>
          )}
        </div>

        {/* Reply form */}
        {showReplyForm && (
          <div className="mt-3 space-y-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={t("replyPlaceholder")}
              rows={2}
              className="resize-none text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleReply}
                disabled={isSubmitting || !replyContent.trim()}
              >
                {isSubmitting ? t("sending") : t("reply")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyContent("");
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}

        {/* Replies */}
        {showReplies && validReplies.length > 0 && (
          <div className="mt-2 pl-4 border-l border-border space-y-0">
            {validReplies.map((reply) => (
              <ReplyItem
                key={reply!._id}
                reply={reply}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
