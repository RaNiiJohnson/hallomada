"use client";

import { useRouter } from "@/i18n/navigation";
import { getAuthHref, getCurrentReturnTo } from "@/lib/auth-return-to";
import type { MouseEvent } from "react";

export function useAuthRequiredAction() {
  const router = useRouter();

  return (event?: MouseEvent<HTMLElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    router.push(getAuthHref("/login", getCurrentReturnTo(window.location)));
  };
}
