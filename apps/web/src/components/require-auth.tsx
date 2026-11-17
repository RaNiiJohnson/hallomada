"use client";

import { useConvexAuth } from "convex/react";
import { useEffect, type ReactNode } from "react";

import { useAuthRequiredAction } from "@/hooks/use-auth-required-action";

/** Sends signed-out visitors to the login page, then back here. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const requireAuthentication = useAuthRequiredAction();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) requireAuthentication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated]);

  if (isLoading || !isAuthenticated) return null;
  return <>{children}</>;
}
