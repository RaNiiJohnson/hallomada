"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export function MobileActionsMenu({ children }: { children: ReactNode }) {
  const t = useTranslations("common");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="rounded-full text-muted-foreground sm:hidden"
          aria-label={t("moreActions")}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label={t("moreActions")}
        className="w-48 space-y-0.5 rounded-lg p-1.5 shadow-lg [&>[data-slot=button]]:h-9 [&>[data-slot=button]]:w-full [&>[data-slot=button]]:justify-start [&>[data-slot=button]]:rounded-md! [&>[data-slot=button]]:border-0! [&>[data-slot=button]]:bg-transparent! dark:[&>[data-slot=button]]:bg-transparent! dark:[&>[data-slot=button]]:hover:bg-accent! [&>[data-slot=button]]:px-2.5 [&>[data-slot=button]]:font-normal [&>[data-slot=button]]:text-foreground! [&>[data-slot=button]]:shadow-none! [&>[data-slot=button]]:hover:bg-accent! [&>[data-slot=button][data-variant=destructive]]:text-destructive!"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
