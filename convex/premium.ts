import type { QueryCtx } from "./_generated/server";

/**
 * While Premium is offered for free, every member has it. When paid Premium
 * launches, set this to false and make `hasPremium` read the member's active
 * subscription (Stripe) instead.
 */
export const PREMIUM_OFFERED_TO_ALL = true;

export async function hasPremium(
  ctx: QueryCtx,
  userId: string,
): Promise<boolean> {
  if (PREMIUM_OFFERED_TO_ALL) return true;
  // TODO(paid Premium): look up the member's active subscription.
  void ctx;
  void userId;
  return false;
}
