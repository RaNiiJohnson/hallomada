"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { useConvexAuth } from "convex/react";
import { useState } from "react";

/**
 * The viewer's remaining monthly applications (job applications + rental
 * dossiers). `undefined` while loading or signed out. `null` limit = unlimited.
 */
export function useApplicationQuota() {
  const { isAuthenticated } = useConvexAuth();
  // Queries cannot read the clock: pass a time that stays stable per mount
  // (rounded to the minute so the subscription is not recreated).
  const [now] = useState(() => Math.floor(Date.now() / 60_000) * 60_000);
  return useQuery(
    api.applicationQuotas.getMine,
    isAuthenticated ? { now } : "skip",
  );
}

/** True when a free member has no application left. */
export function isQuotaReached(
  usage: ReturnType<typeof useApplicationQuota>,
) {
  return usage != null && usage.limit !== null && usage.remaining === 0;
}
