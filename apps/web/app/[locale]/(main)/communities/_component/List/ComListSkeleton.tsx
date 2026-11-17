import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, CheckIcon, MessageSquare, Share2 } from "lucide-react";

export function ComListSkeleton() {
  return (
    <div className="block px-4 py-4 border-b border-border bg-background max-w-4xl mx-auto">
      <div className="flex sm:flex-row flex-col mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="size-3 rounded-sm" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      <div className="block">
        <Skeleton className="h-6 w-1/2" />
        <div className="mt-2 space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-full" />
        </div>
        <Skeleton className="h-3 w-16 mt-2.5" />
      </div>

      <div className="flex items-center gap-1 mt-2">
        <div className="group flex items-center gap-1.5 text-muted-foreground transition-colors h-8 px-2">
          <MessageSquare
            size={15}
            className="transition-transform group-active:scale-95"
          />
          <span className="text-xs font-medium">0</span>
        </div>
        <div className="group flex items-center gap-1.5 text-muted-foreground transition-colors h-8 px-2">
          <CheckIcon
            size={15}
            className="transition-transform group-active:scale-95"
          />
          <span className="text-xs font-medium">0</span>
        </div>
        <div className="group flex items-center gap-1.5 text-muted-foreground transition-colors h-8 px-2">
          <Share2
            size={15}
            className="transition-transform group-active:scale-95"
          />
        </div>
        <div className="group flex items-center gap-1.5 text-muted-foreground transition-colors h-8 px-2">
          <Bookmark
            size={15}
            className="transition-transform group-active:scale-95"
          />
        </div>
      </div>
    </div>
  );
}
