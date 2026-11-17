import { ConvexError } from "convex/values";

/** Returns the application error code thrown by `throwAppError`, if any. */
export function getConvexErrorCode(error: unknown): string | undefined {
  if (!(error instanceof ConvexError)) return undefined;
  const data: unknown = error.data;
  if (typeof data !== "object" || data === null) return undefined;
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
