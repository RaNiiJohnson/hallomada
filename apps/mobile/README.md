# Hallomada mobile

Expo (SDK 58) + Expo Router app, connected to the same Convex backend as the web
app (`packages/backend`).

## Setup

Create `apps/mobile/.env.local`:

```bash
EXPO_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud
```

Then, from the repository root:

```bash
pnpm mobile
```

Scan the QR code with Expo Go, or press `a` / `i` for an emulator.

## Sharing code

- `@convex/*` points to `packages/backend/convex/*` (typed `api`, `Id<...>`).
- `@hallomada/shared/<module>` holds pure TypeScript rules shared with the web
  and the backend.
- UI components are native; web components from `apps/web` cannot be reused.
