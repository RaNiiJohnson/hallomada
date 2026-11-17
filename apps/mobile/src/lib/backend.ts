import { expoClient } from '@better-auth/expo/client';
import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { ConvexReactClient } from 'convex/react';
import * as SecureStore from 'expo-secure-store';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
// Web app URL: its /api/auth route proxies Better Auth to Convex, and Google
// OAuth callbacks land there, so the mobile client must use the same origin.
const siteUrl = process.env.EXPO_PUBLIC_SITE_URL;

function createBackend(convexUrl: string, siteUrl: string) {
  return {
    convex: new ConvexReactClient(convexUrl, { unsavedChangesWarning: false }),
    authClient: createAuthClient({
      baseURL: siteUrl,
      plugins: [
        convexClient(),
        expoClient({
          scheme: 'hallomada',
          storagePrefix: 'hallomada',
          storage: SecureStore,
        }),
      ],
    }),
  };
}

/**
 * Convex + Better Auth clients. Null when the env vars are missing so the app
 * can show a setup message instead of crashing at startup.
 */
export const backend =
  convexUrl && siteUrl ? createBackend(convexUrl, siteUrl) : null;

/** Auth client for screens rendered under the configured-backend guard. */
export function requireAuthClient() {
  if (!backend) throw new Error('Backend is not configured');
  return backend.authClient;
}
