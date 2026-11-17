import { Resend } from "@convex-dev/resend";
import { components, internal } from "./_generated/api";

export const resend: Resend = new Resend(components.resend, {
  testMode: false,
  // Delivery events come from the /resend-webhook route (see http.ts).
  onEmailEvent: internal.jobs.emailEvents.handleEmailEvent,
});
