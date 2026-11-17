/**
 * Global mock for the PostHog component client.
 * Applied via vitest.config.ts `setupFiles` so every test file gets it
 * automatically — no need to repeat vi.mock("../integrations/posthog", ...)
 * per test file.
 *
 * IMPORTANT: the specifier below ("./integrations/posthog") is relative to
 * THIS file's location (convex/test.posthog.mock.ts). Vitest resolves it to
 * an absolute path and mocks by that resolved id, so it correctly intercepts
 * imports from any other file (e.g. "../integrations/posthog" from
 * convex/posts/mutations.ts) as long as they point to the same file.
 */
import { vi } from "vitest";

vi.mock("./integrations/posthog", () => ({
  posthog: {
    capture: vi.fn().mockResolvedValue(undefined),
    captureImmediate: vi.fn().mockResolvedValue(undefined),
    captureException: vi.fn().mockResolvedValue(undefined),
    identify: vi.fn().mockResolvedValue(undefined),
    groupIdentify: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
  },
  posthogDistinctId: (userId: string) => `${userId}`,
}));
