"use client";

import { useWidget } from "@/components/WidgetContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { useConvexAuth } from "convex/react";
import { MessageCircle, Minus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ChatWindow } from "./chatComponents/ChatWindow";
import { CommunityList } from "./chatComponents/CommunityList";
import { Community } from "./chatComponents/types";

// ─── Chat Widget ──────────────────────────────────────────

export function ChatWidget() {
  const { isAuthenticated } = useConvexAuth();
  const { activeWidget, openWidget, closeWidget } = useWidget();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(
    null,
  );
  const isMobile = useIsMobile();

  const isOpen = activeWidget === "chat";

  const communities = useQuery(
    api.communities.queries.getMyCommunities,
    isAuthenticated ? {} : "skip",
  );
  const unreadIds =
    useQuery(
      api.chat.queries.getCommunitiesWithUnread,
      isAuthenticated ? {} : "skip",
    ) ?? [];

  const hasAnyUnread = unreadIds.length > 0;

  const handleClose = useCallback(() => {
    closeWidget("chat");
    setIsFullscreen(false);
    setSelectedCommunity(null);
  }, [closeWidget]);

  // History back to close on mobile
  useEffect(() => {
    if (isOpen && isMobile) window.history.pushState({ chatOpen: true }, "");
    const handlePopState = () => {
      if (isOpen && isMobile) {
        handleClose();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isOpen, isMobile, handleClose]);

  if (!isAuthenticated || !communities) return null;

  const content = selectedCommunity ? (
    <ChatWindow
      community={selectedCommunity}
      onBack={() => setSelectedCommunity(null)}
      onClose={handleClose}
      isFullscreen={isFullscreen}
      onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
    />
  ) : (
    <CommunityList
      communities={communities as Community[]}
      onSelect={setSelectedCommunity}
      onClose={handleClose}
      isFullscreen={isFullscreen}
      onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
      unreadIds={unreadIds}
    />
  );

  const handleOpenChange = (open: boolean) => {
    if (open) {
      openWidget("chat");
    } else {
      handleClose();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isMobile ? (
        <>
          {!isOpen && (
            <button
              onClick={() => openWidget("chat")}
              className="relative w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
            >
              <MessageCircle size={18} />
              {hasAnyUnread && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-destructive rounded-full border-2 border-background" />
              )}
            </button>
          )}

          <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <SheetContent
              side="bottom"
              className="h-[85vh] p-0 flex flex-col rounded-t-2xl overflow-hidden border-t border-border bg-background"
              showCloseButton={false}
            >
              <SheetTitle className="sr-only">Chat</SheetTitle>
              <SheetDescription className="sr-only">
                Messagerie des communautés
              </SheetDescription>
              {content}
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button className="relative w-12 h-12 rounded-full text-primary-foreground flex items-center justify-center shadow-lg transition-colors sm:flex bg-primary hover:bg-primary/90">
              <MessageCircle size={18} />
              {hasAnyUnread && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-destructive rounded-full border-2 border-background" />
              )}
            </button>
          </PopoverTrigger>

          {/* Dummy element for the minus button when open to maintain layout identical to what PopoverTrigger does */}
          {isOpen && (
            <button
              onClick={handleClose}
              className="relative w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors sm:hidden"
            >
              <Minus size={18} />
            </button>
          )}

          <PopoverContent
            side="top"
            align="end"
            sideOffset={8}
            className="hidden sm:flex p-0 rounded-xl border border-border shadow-xl overflow-hidden max-h-[85vh] flex-col w-80 h-96"
          >
            {content}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
