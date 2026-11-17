# Hallomada mobile

Expo (SDK 58) + Expo Router app, connected to the same Convex backend as the web
app (`packages/backend`).

## Setup

Create `apps/mobile/.env.local`:

```bash
EXPO_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud
EXPO_PUBLIC_SITE_URL=http://192.168.1.10:3000   # web app, reachable from the phone
```

Then, from the repository root:

```bash
pnpm mobile
```

Scan the QR code with Expo Go, or press `a` / `i` for an emulator.

## Authentication

Better Auth runs in Convex; the app talks to it through the web app's
`/api/auth` proxy (`EXPO_PUBLIC_SITE_URL`), so the web dev server must be running
for sign-in. The session cookie is stored in `expo-secure-store`.

- Email/password and Google sign-in are available in the **Compte** tab;
  registration still happens on the web.
- The backend trusts the `hallomada://` scheme. For Expo Go, add `exp://` to
  `BETTER_AUTH_TRUSTED_ORIGINS` on the dev deployment:
  `pnpm --filter @hallomada/backend exec convex env set BETTER_AUTH_TRUSTED_ORIGINS "http://localhost:3000,exp://"`.

## Sharing code

- `@convex/*` points to `packages/backend/convex/*` (typed `api`, `Id<...>`).
- `@hallomada/shared/<module>` holds pure TypeScript rules shared with the web
  and the backend.
- UI components are native; web components from `apps/web` cannot be reused.
