import posthog from "posthog-js";

let initialized = false;

function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST,
  );
}

/** Starts PostHog. Must only be called once the visitor granted consent. */
export function enableAnalytics() {
  if (!isConfigured()) return;
  if (initialized) {
    posthog.opt_in_capturing();
    return;
  }
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
  initialized = true;
}

export function disableAnalytics() {
  if (!initialized) return;
  posthog.opt_out_capturing();
  posthog.reset();
}

export function isAnalyticsActive() {
  return initialized && !posthog.has_opted_out_capturing();
}

export function identifyUser(userId: string, properties: Record<string, string>) {
  if (isAnalyticsActive()) posthog.identify(userId, properties);
}

export function resetIdentity() {
  if (isAnalyticsActive()) posthog.reset();
}

export function captureException(error: unknown) {
  if (isAnalyticsActive()) posthog.captureException(error);
}
