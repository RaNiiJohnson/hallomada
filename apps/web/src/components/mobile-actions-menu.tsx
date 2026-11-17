"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/** A "⋯" button that opens a small menu of action buttons. Hidden from `sm`
 * up unless `mobileOnly` is false. */
export function MobileActionsMenu({
  children,
  mobileOnly = true,
}: {
  children: ReactNode;
  mobileOnly?: boolean;
}) {
  const t = useTranslations("common");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className={cn(
            "rounded-full text-muted-foreground",
            mobileOnly && "sm:hidden",
          )}
          aria-label={t("moreActions")}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label={t("moreActions")}
        className="w-48 space-y-1 rounded-lg p-1.5 shadow-lg [&>[data-variant]]:h-9! [&>[data-variant]]:w-full! [&>[data-variant]]:justify-start! [&>[data-variant]]:rounded-md! [&>[data-variant]]:px-2.5 [&>[data-variant]:not([data-variant=default])]:border-0! [&>[data-variant]:not([data-variant=default])]:bg-transparent! dark:[&>[data-variant]:not([data-variant=default])]:bg-transparent! [&>[data-variant]:not([data-variant=default])]:font-normal [&>[data-variant]:not([data-variant=default])]:text-foreground! [&>[data-variant]:not([data-variant=default])]:shadow-none! [&>[data-variant]:not([data-variant=default])]:hover:bg-accent! dark:[&>[data-variant]:not([data-variant=default])]:hover:bg-accent! [&>[data-variant][data-variant=destructive]]:text-destructive! [&>[data-variant]][data-variant=default]:font-medium"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
