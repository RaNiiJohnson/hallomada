import type { ActionCtx } from "../_generated/server";
import { limiter } from "../rateLimits";
import { throwLimitReached } from "../utils/errors";

export async function enforceTranslationLimits(
  ctx: ActionCtx,
  args: { userId: string; resourceKey: string },
) {
  const userLimit = await limiter.limit(ctx, "translatePerUser", {
    key: args.userId,
  });
  if (!userLimit.ok) {
    throwLimitReached("Translation rate limit exceeded", {
      retryAfter: userLimit.retryAfter ?? 0,
    });
  }

  const resourceLimit = await limiter.limit(ctx, "translateResource", {
    key: args.resourceKey,
  });
  if (!resourceLimit.ok) {
    throwLimitReached("This translation is already being generated", {
      retryAfter: resourceLimit.retryAfter ?? 0,
    });
  }
}
