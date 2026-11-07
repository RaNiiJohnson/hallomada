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

/**
 * Premium features that are built but not shown yet ("coming soon"). Flip a
 * flag to switch the feature back on; the screens already handle it.
 */
export const comingSoon = {
  /** Premium applications and dossiers arrive highlighted for the recipient. */
  highlightedApplications: false,
};

/** Whether this member's application / dossier should be highlighted. */
export async function hasHighlight(
  ctx: QueryCtx,
  userId: string,
): Promise<boolean> {
  if (!comingSoon.highlightedApplications) return false;
  return hasPremium(ctx, userId);
}
