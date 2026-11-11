import { ConvexReactClient } from 'convex/react';

const url = process.env.EXPO_PUBLIC_CONVEX_URL;

/**
 * Shared Convex client. Null when EXPO_PUBLIC_CONVEX_URL is missing so the app
 * can show a setup message instead of crashing at startup.
 */
export const convex = url ? new ConvexReactClient(url, { unsavedChangesWarning: false }) : null;
