/** A visitor's views of one publication count once per this period. */
export const VIEW_DEDUP_MS = 12 * 60 * 60 * 1000;
/** Days shown in the owner's daily chart. */
export const STATS_DAYS = 30;

/** "2026-11-03" for a timestamp, in UTC. */
export function dayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}
