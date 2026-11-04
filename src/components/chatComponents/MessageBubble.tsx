import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTimeTranslations } from "@/hooks/use-time-translations";
import { getRelativeTime } from "@/lib/date";
import { Doc, Id } from "@convex/_generated/dataModel";
import { Copy, Edit2, Flag, MoreVertical, Send, Trash, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useLongPress } from "./useLongPress";

export function MessageBubble({
  msg,
  isMe,
  editingMessageId,
  editContent,
  setEditingMessageId,
  setEditContent,
  handleEditSend,
  handleEditKeyDown,
  onDeleteRequest,
  timeT,
}: {
  msg: Doc<"communityMessages">;
  isMe: boolean;
  editingMessageId: Id<"communityMessages"> | null;
  editContent: string;
  setEditingMessageId: (id: Id<"communityMessages"> | null) => void;
  setEditContent: (content: string) => void;
  handleEditSend: () => void;
  handleEditKeyDown: (e: React.KeyboardEvent) => void;
  onDeleteRequest: (id: Id<"communityMessages">) => void;
  timeT: ReturnType<typeof useTimeTranslations>;
}) {
  const isEditing = editingMessageId === msg._id;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    toast.success("Message copié !");
    setDropdownOpen(false);
  };

  // Long press for mobile — open the dropdown
  const longPressHandlers = useLongPress(
    useCallback(() => {
      if (!isEditing) setDropdownOpen(true);
    }, [isEditing]),
  );

  return (
    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
      {!isMe && (
        <span className="text-xs font-medium text-muted-foreground mb-0.5 ml-1 select-none md:select-text">
          {msg.authorName ?? "Anonyme"}
        </span>
      )}

      <div
        className={`group flex items-center gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"} max-w-[90%]`}
        {...(!isEditing ? longPressHandlers : {})}
      >
        <div
          className={`px-3 py-2 rounded-2xl text-sm wrap-break-word ${
            isMe
              ? "bg-primary text-primary-foreground rounded-br-none"
              : "bg-muted text-foreground rounded-bl-none"
          }`}
        >
          {isEditing ? (
            <div className="flex items-center gap-2 min-w-[200px]">
              <input
                autoFocus
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className="flex-1 text-sm bg-background text-foreground rounded px-2 py-1 outline-none"
              />
              <button
                onClick={handleEditSend}
                className="text-primary-foreground hover:opacity-80 shrink-0"
              >
                <Send size={14} />
              </button>
              <button
                onClick={() => setEditingMessageId(null)}
                className="text-primary-foreground hover:opacity-80 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <span className="select-none md:select-text">{msg.content}</span>
          )}
        </div>

        {!isEditing && (
          <div
            className={`opacity-0 group-hover:opacity-100 transition-opacity shrink-0 sm:block ${dropdownOpen ? "opacity-100" : ""}`}
          >
            {isMobile ? (
              <Sheet open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <SheetContent
                  side="bottom"
                  className="p-0 rounded-t-2xl max-h-[85vh] border-t border-border bg-background"
                >
                  <SheetTitle className="sr-only">
                    Options du message
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Actions pour le message sélectionné
                  </SheetDescription>
                  <div className="flex flex-col py-4">
                    {isMe && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          setEditingMessageId(msg._id);
                          setEditContent(msg.content);
                        }}
                        className="flex items-center gap-3 px-6 py-4 hover:bg-muted transition-colors text-left"
                      >
                        <Edit2 size={20} className="text-muted-foreground" />
                        <span className="text-base font-medium">
                          Modifier le message
                        </span>
                      </button>
                    )}
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-3 px-6 py-4 hover:bg-muted transition-colors text-left"
                    >
                      <Copy size={20} className="text-muted-foreground" />
                      <span className="text-base font-medium">
                        Copier le texte
                      </span>
                    </button>
                    {isMe ? (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onDeleteRequest(msg._id);
                        }}
                        className="flex items-center gap-3 px-6 py-4 hover:bg-muted transition-colors text-left text-destructive"
                      >
                        <Trash size={20} />
                        <span className="text-base font-medium">
                          Supprimer le message
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          toast.info("Le signalement sera bientôt disponible.");
                        }}
                        className="flex items-center gap-3 px-6 py-4 hover:bg-muted transition-colors text-left text-destructive"
                      >
                        <Flag size={20} />
                        <span className="text-base font-medium">
                          Signaler le message
                        </span>
                      </button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted outline-none">
                    <MoreVertical size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isMe ? "end" : "start"}>
                  {isMe && (
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingMessageId(msg._id);
                        setEditContent(msg.content);
                      }}
                    >
                      <Edit2 size={14} className="mr-2" />
                      Modifier
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy size={14} className="mr-2" />
                    Copier
                  </DropdownMenuItem>
                  {isMe ? (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDeleteRequest(msg._id)}
                    >
                      <Trash size={14} className="mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() =>
                        toast.info("Le signalement sera bientôt disponible.")
                      }
                    >
                      <Flag size={14} className="mr-2" />
                      Signaler
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-0.5 mx-1">
        <span className="text-xs text-muted-foreground select-none md:select-text">
          {getRelativeTime(msg._creationTime, timeT)}
        </span>
        {msg.editedAt && (
          <span className="text-xs text-muted-foreground/70 italic">
            (modifié)
          </span>
        )}
      </div>
    </div>
  );
}
