import { api } from '@convex/_generated/api';
import { useConvexAuth, useQuery } from 'convex/react';
import { useState } from 'react';

/**
 * The viewer's remaining monthly applications. `undefined` while loading or
 * signed out; a `null` limit means unlimited (Premium).
 */
export function useApplicationQuota() {
  const { isAuthenticated } = useConvexAuth();
  // Queries cannot read the clock: pass a time that stays stable per mount.
  const [now] = useState(() => Math.floor(Date.now() / 60_000) * 60_000);
  return useQuery(api.applicationQuotas.getMine, isAuthenticated ? { now } : 'skip');
}
