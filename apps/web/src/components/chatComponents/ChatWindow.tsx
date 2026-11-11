import { useTimeTranslations } from "@/hooks/use-time-translations";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { usePaginatedQuery, useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import { ChevronLeft, Maximize2, Minimize2, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { MessageBubble } from "./MessageBubble";
import { Community } from "./types";

export function ChatWindow({
  community,
  onBack,
  onClose,
  isFullscreen,
  onToggleFullscreen,
}: {
  community: Community;
  onBack: () => void;
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const [content, setContent] = useState("");
  const [editingMessageId, setEditingMessageId] =
    useState<Id<"communityMessages"> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<Id<"communityMessages"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sendMessage = useMutation(api.chat.mutations.sendMessage);
  const editMessage = useMutation(api.chat.mutations.editMessage);
  const deleteMessage = useMutation(api.chat.mutations.deleteMessage);
  const markAsRead = useMutation(api.chat.mutations.markAsRead);
  const me = useQuery(api.communities.queries.getMe);
  const bottomRef = useRef<HTMLDivElement>(null);

  const timeT = useTimeTranslations();

  const { results, loadMore, status } = usePaginatedQuery(
    api.chat.queries.getMessages,
    { communityId: community._id },
    { initialNumItems: 10 },
  );

  const messages = useMemo(() => [...results].reverse(), [results]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setIsAtBottom(atBottom);
    if (atBottom) setNewCount(0);
  };

  const lastMessageId = messages[messages.length - 1]?._id;

  // Marquer comme lu à l'ouverture
  useEffect(() => {
    markAsRead({ communityId: community._id });
  }, [community._id, markAsRead]);

  useEffect(() => {
    if (!lastMessageId) return;

    const lastMsg = messages[messages.length - 1];
    const isMe = me?._id === lastMsg.authorId;

    if (isAtBottom || isMe) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: resetting counter when scrolled to bottom or own message
      if (isMe) setNewCount(0);
    } else {
      setNewCount((c) => c + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessageId]);

  // ─── Send ───────────────────────────────────────────────

  const handleSend = async () => {
    if (!content.trim()) return;
    const text = content;
    setContent("");

    try {
      await sendMessage({ communityId: community._id, content: text });
    } catch {
      setContent(text); // Restore on error
      toast.error("Erreur lors de l'envoi");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Edit ───────────────────────────────────────────────

  const handleEditSend = async () => {
    if (!editContent.trim() || !editingMessageId) return;
    const prevId = editingMessageId;
    const prevContent = editContent;

    setEditingMessageId(null);
    setEditContent("");

    try {
      await editMessage({
        id: prevId,
        communityId: community._id,
        content: prevContent,
      });
    } catch {
      setEditingMessageId(prevId);
      setEditContent(prevContent);
      toast.error("Erreur lors de la modification");
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSend();
    }
    if (e.key === "Escape") {
      setEditingMessageId(null);
      setEditContent("");
    }
  };

  // ─── Delete ─────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      await deleteMessage({ id: deleteTarget, communityId: community._id });
      setDeleteTarget(null);
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-2 px-4 py-3 sm:px-3 sm:py-2 border-b border-border bg-card shrink-0 z-20">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1 sm:p-0 sm:ml-0"
        >
          <ChevronLeft className="size-5 sm:size-4" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
            {community.name[0]}
          </div>
          <span className="text-sm font-semibold text-foreground truncate">
            {community.name}
          </span>
        </div>
        <button
          onClick={onToggleFullscreen}
          className="hidden sm:block text-muted-foreground hover:text-foreground transition-colors mr-1"
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 sm:p-0 sm:mr-0"
        >
          <X className="size-5 sm:size-4" />
        </button>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-2 overscroll-contain"
      >
        {status === "CanLoadMore" && (
          <button
            onClick={() => loadMore(20)}
            className="text-xs text-primary hover:underline text-center w-full mb-2"
          >
            Charger plus
          </button>
        )}
        {messages.map((msg) => {
          const isMe = me?._id === msg.authorId;
          return (
            <MessageBubble
              key={msg._id}
              msg={msg}
              isMe={isMe}
              editingMessageId={editingMessageId}
              editContent={editContent}
              setEditingMessageId={setEditingMessageId}
              setEditContent={setEditContent}
              handleEditSend={handleEditSend}
              handleEditKeyDown={handleEditKeyDown}
              onDeleteRequest={setDeleteTarget}
              timeT={timeT}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Badge nouveau message */}
      {!isAtBottom && newCount > 0 && (
        <button
          onClick={() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            setNewCount(0);
          }}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-lg z-10 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-1.5"
        >
          ↓ {newCount} nouveau{newCount > 1 ? "x" : ""}
        </button>
      )}

      <div className="p-2 border-t border-border bg-card shrink-0 relative z-20">
        <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message..."
            className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={handleSend}
            disabled={!content.trim()}
            className="text-primary hover:text-primary/80 disabled:text-muted-foreground transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
