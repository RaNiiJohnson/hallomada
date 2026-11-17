// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  captureException: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  has_opted_out_capturing: vi.fn(() => false),
}));
vi.mock("posthog-js", () => ({ default: posthog }));

describe("analytics gate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.example.test");
  });

  it("sends nothing before consent is granted", async () => {
    const analytics = await import("./analytics");
    analytics.identifyUser("u1", { role: "user" });
    analytics.captureException(new Error("boom"));
    analytics.resetIdentity();
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.identify).not.toHaveBeenCalled();
    expect(posthog.captureException).not.toHaveBeenCalled();
  });

  it("initialises once consent is granted and stops after refusal", async () => {
    const analytics = await import("./analytics");
    analytics.enableAnalytics();
    expect(posthog.init).toHaveBeenCalledTimes(1);
    analytics.identifyUser("u1", { role: "user" });
    expect(posthog.identify).toHaveBeenCalledWith("u1", { role: "user" });

    analytics.disableAnalytics();
    expect(posthog.opt_out_capturing).toHaveBeenCalled();
    posthog.has_opted_out_capturing.mockReturnValue(true);
    analytics.captureException(new Error("after refusal"));
    expect(posthog.captureException).not.toHaveBeenCalled();
    posthog.has_opted_out_capturing.mockReturnValue(false);
  });

  it("does nothing when PostHog is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "");
    const analytics = await import("./analytics");
    analytics.enableAnalytics();
    expect(posthog.init).not.toHaveBeenCalled();
  });
});
