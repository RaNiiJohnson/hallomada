import { Maximize2, Minimize2, X } from "lucide-react";
import { Community } from "./types";

export function CommunityList({
  communities,
  onSelect,
  onClose,
  isFullscreen,
  onToggleFullscreen,
  unreadIds,
}: {
  communities: Community[];
  onSelect: (c: Community) => void;
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  unreadIds: string[];
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 sm:px-3 sm:py-2 border-b border-border bg-card shrink-0">
        <span className="text-sm font-semibold text-foreground">
          Mes communautés
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleFullscreen}
            className="hidden sm:block text-muted-foreground hover:text-foreground transition-colors"
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
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {communities.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center p-4">
            Rejoignez une communauté pour accéder au chat.
          </p>
        ) : (
          communities.map((community) => {
            const hasUnread = unreadIds.includes(community._id);
            return (
              <button
                key={community._id}
                onClick={() => onSelect(community)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 sm:px-3 sm:py-2.5 hover:bg-muted transition-colors text-left ${
                  hasUnread ? "bg-primary/5" : ""
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {community.name[0]}
                  </div>
                  {/* Point rouge si non lu */}
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-destructive rounded-full border-2 border-background" />
                  )}
                </div>
                <span
                  className={`text-sm truncate flex-1 ${hasUnread ? "font-semibold text-foreground" : "text-foreground"}`}
                >
                  {community.name}
                </span>
                {hasUnread && (
                  <span className="text-xs text-destructive font-medium shrink-0">
                    nouveau
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
