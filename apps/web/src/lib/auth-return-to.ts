import { routing } from "../i18n/routing";

export const POST_AUTH_DEFAULT_PATH = "/communities";

const returnToOrigin = "https://hallomada.local";

/**
 * Keeps post-auth navigation inside the application. The value is deliberately
 * locale-agnostic because next-intl adds the active locale during navigation.
 */
export function getSafeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return POST_AUTH_DEFAULT_PATH;
  }

  try {
    const url = new URL(value, returnToOrigin);
    if (url.origin !== returnToOrigin || url.pathname.startsWith("//")) {
      return POST_AUTH_DEFAULT_PATH;
    }

    const locale = routing.locales.find(
      (locale) => url.pathname === `/${locale}` || url.pathname.startsWith(`/${locale}/`),
    );
    const pathname = locale
      ? url.pathname.slice(locale.length + 1) || "/"
      : url.pathname;

    return `${pathname}${url.search}${url.hash}`;
  } catch {
    return POST_AUTH_DEFAULT_PATH;
  }
}

export function getAuthHref(
  path: "/login" | "/register" | "/verify-email",
  returnTo: string | null | undefined,
): string {
  return `${path}?returnTo=${encodeURIComponent(getSafeReturnTo(returnTo))}`;
}

export function getCurrentReturnTo(
  location: Pick<Location, "pathname" | "search" | "hash">,
): string {
  return getSafeReturnTo(`${location.pathname}${location.search}${location.hash}`);
}

export function getLocalizedCallbackUrl(locale: string, returnTo: string): string {
  return `/${locale}${getSafeReturnTo(returnTo)}`;
}
