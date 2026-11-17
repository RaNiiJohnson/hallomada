/**
 * Global mock for the Rate Limiter component client.
 * Always returns { ok: true } so business logic under test is never
 * throttled unless a specific test explicitly overrides this mock.
 */
import { vi } from "vitest";

vi.mock("./rateLimits", () => ({
  limiter: {
    limit: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }),
    check: vi.fn().mockResolvedValue({ ok: true, retryAfter: 0 }),
    reset: vi.fn().mockResolvedValue(undefined),
  },
}));
