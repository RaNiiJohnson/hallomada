import { throwValidationError } from "./errors";

/**
 * Server-side size limits. The forms enforce friendlier limits client-side, but
 * a direct call to a public mutation skips them, so every user-supplied text
 * stored in the database is bounded here too.
 */
export const MAX_LENGTH = {
  title: 200,
  name: 120,
  shortText: 300,
  email: 254,
  url: 2048,
  description: 10_000,
  comment: 5_000,
  chatMessage: 2_000,
  listItem: 100,
} as const;

export const MAX_LIST_ITEMS = 30;

export function assertMaxLength(
  field: string,
  value: string | null | undefined,
  max: number,
) {
  if (value !== undefined && value !== null && value.length > max) {
    throwValidationError(`${field} cannot exceed ${max} characters`);
  }
}

export function assertTextLimits(
  values: object,
  limits: Record<string, number>,
) {
  const record = values as Record<string, unknown>;
  for (const [field, max] of Object.entries(limits)) {
    const value = record[field];
    if (typeof value === "string") assertMaxLength(field, value, max);
  }
}

export function assertStringList(
  field: string,
  values: string[] | undefined,
  maxItemLength: number = MAX_LENGTH.listItem,
) {
  if (!values) return;
  if (values.length > MAX_LIST_ITEMS) {
    throwValidationError(`${field} cannot have more than ${MAX_LIST_ITEMS} items`);
  }
  for (const item of values) assertMaxLength(field, item, maxItemLength);
}

/** Rejects empty (whitespace-only) content and content over `max` characters. */
export function assertMessageContent(
  field: string,
  value: string,
  max: number,
) {
  if (!value.trim()) throwValidationError(`${field} is required`);
  assertMaxLength(field, value, max);
}
