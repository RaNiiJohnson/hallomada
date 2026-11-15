import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False during server rendering and the first client render (hydration), true after.
 * Use it on web to render server-safe defaults first, so the HTML matches.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
