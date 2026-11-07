import { DAY, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const limiter = new RateLimiter(components.rateLimiter, {
  // 2 posts max par minute par utilisateur
  createPostPerUser: {
    kind: "token bucket",
    rate: 2,
    period: 5 * MINUTE,
    capacity: 2,
  },
  translatePerUser: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 5,
  },
  translateResource: {
    kind: "fixed window",
    rate: 1,
    period: MINUTE,
  },
  uploadUrlPerUser: {
    kind: "token bucket",
    rate: 12,
    period: MINUTE,
    capacity: 6,
  },
  chatMessagePerUser: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 10,
  },
  commentPerUser: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 5,
  },
  rentalFilePerUser: {
    kind: "token bucket",
    rate: 20,
    period: DAY,
  },
  applicationPerUser: {
    kind: "token bucket",
    rate: 20,
    period: DAY,
    capacity: 10,
  },
  // Resending an application whose email failed: 3 per application per day.
  // A broken recruiter address would otherwise bounce on every click.
  applicationRetryPerApplication: {
    kind: "token bucket",
    rate: 3,
    period: DAY,
    capacity: 3,
  },
  // Silent protection against abuse (not shown to members): 20 communities
  // per 30 days per user.
  createCommunityPerUser: {
    kind: "fixed window",
    rate: 20,
    period: 30 * DAY,
  },
  reportPerUser: {
    kind: "token bucket",
    rate: 10,
    period: DAY,
    capacity: 10,
  },
});
