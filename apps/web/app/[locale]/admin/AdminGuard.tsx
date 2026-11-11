"use client";

import { redirect } from "@/i18n/navigation";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { useLocale } from "next-intl";
import { ReactNode } from "react";

export function AdminGuard({ children }: { children: ReactNode }) {
  const currentUser = useQuery(api.auth.auth.getCurrentUser);
  const locale = useLocale();

  if (currentUser === undefined) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (currentUser === null || currentUser.role !== "admin") {
    redirect({ href: "/", locale });
  }

  return <>{children}</>;
}
