"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTimeTranslations } from "@/hooks/use-time-translations";
import { getRelativeTime } from "@/lib/date";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "./deleteConfirmDialog";
import { LikeButton } from "./likeButton";

export function ReplyItem({
  reply,
  currentUserId,
}: {
  reply: {
    _id: Id<"postCommentReplies">;
    _creationTime: number;
    authorId?: string;
    authorName?: string;
    authorImage?: string;
    content: string;
    likes: { userId: string }[];
    likesCount: number;
    userHasLiked?: boolean;
  } | null;
  currentUserId?: string;
}) {
  const likeReply = useMutation(api.posts.likes.mutations.likeReply);
  const updateReply = useMutation(api.posts.comments.mutations.updateReply);
  const deleteReply = useMutation(api.posts.comments.mutations.deleteReply);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const timeT = useTimeTranslations();
  const t = useTranslations("communities.comment");

  if (!reply) return null;

  const isOwner = currentUserId && reply.authorId === currentUserId;

  const handleLike = async () => {
    await likeReply({ replyId: reply._id });
  };

  const handleStartEdit = () => {
    setEditContent(reply.content);
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
      await updateReply({ replyId: reply._id, content: editContent });
      setIsEditing(false);
      toast.success(t("replyUpdated"));
    } catch {
      toast.error(t("updateError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteReply({ replyId: reply._id });
      toast.success(t("replyDeleted"));
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex gap-2.5 py-3">
      <div className="flex-1 min-w-0">
        <p className="flex items-center gap-1.5 text-xs mb-1">
          <span className="text-primary font-medium">{reply.authorName}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {getRelativeTime(reply._creationTime, timeT)}
          </span>
        </p>

        {isEditing ? (
          <div className="space-y-2 mb-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={2}
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
            {reply.content}
          </p>
        )}

        <div className="flex items-center gap-1 -ml-2 flex-wrap">
          <LikeButton
            initialCount={reply.likesCount}
            onLike={handleLike}
            initialIsLiked={reply.userHasLiked}
          />

          {isOwner && !isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartEdit}
                aria-label={t("edit")}
                className="text-muted-foreground hover:text-foreground h-8 px-2"
              >
                <Pencil size={13} />
              </Button>

              <DeleteConfirmDialog
                title={t("deleteReplyTitle")}
                description={t("deleteReplyDescription")}
                onConfirm={handleDelete}
                isPending={isDeleting}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("delete")}
                    className="text-muted-foreground hover:text-destructive h-8 px-2"
                  >
                    <Trash2 size={13} />
                  </Button>
                }
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
