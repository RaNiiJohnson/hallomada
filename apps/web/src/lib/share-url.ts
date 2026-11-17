export function resolveShareUrl(
  url: string | undefined,
  location: { href: string; origin: string } | undefined,
) {
  if (!location) return url ?? "";
  return url ? new URL(url, location.origin).href : location.href;
}
