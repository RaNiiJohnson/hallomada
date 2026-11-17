import { PostHog } from "@posthog/convex";
import { components } from "../_generated/api";

export const posthog = new PostHog(components.posthog);

export function posthogDistinctId(userId: string) {
  return `${userId}`;
}
