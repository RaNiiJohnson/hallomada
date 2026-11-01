/**
 * Provider (prestataire) constants and contact helpers shared by the forms and
 * the Convex validation, so both sides normalize contacts the same way.
 */
export const providerCategoryValues = [
  "food",
  "photo",
  "beauty",
  "events",
  "fashion",
  "transport",
  "lessons",
  "digital",
  "other",
] as const;

export type ProviderCategory = (typeof providerCategoryValues)[number];

export const providerServiceModeValues = [
  "atProvider",
  "atClient",
  "online",
] as const;

export type ProviderServiceMode = (typeof providerServiceModeValues)[number];

export const MAX_PROVIDER_PHOTOS = 6;
export const MAX_PROVIDER_SERVICES = 12;
export const MAX_PROVIDER_TAGLINE = 120;
export const MAX_PROVIDER_SERVICE_NAME = 80;
export const MAX_PROVIDER_SERVICE_PRICE = 40;

/**
 * Turns a phone number typed in German national format ("0151 2345678"),
 * with a 00 prefix, or in international format into E.164 ("+491512345678").
 * Numbers without a country code are assumed to be German.
 * Returns null when the input cannot be a valid phone number.
 */
export function normalizePhoneNumber(raw: string): string | null {
  const compact = raw.trim().replace(/[\s().\/-]/g, "");
  if (!compact) return null;

  let international: string;
  if (compact.startsWith("+")) international = compact;
  else if (compact.startsWith("00")) international = `+${compact.slice(2)}`;
  else if (compact.startsWith("0")) international = `+49${compact.slice(1)}`;
  else international = `+49${compact}`;

  return /^\+[1-9]\d{7,14}$/.test(international) ? international : null;
}

/** wa.me link opening a chat with an optional pre-filled message. */
export function whatsappLink(e164: string, message?: string) {
  const base = `https://wa.me/${e164.replace(/^\+/, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const providerSocialNetworks = {
  facebook: {
    hosts: ["facebook.com", "fb.com", "m.facebook.com", "web.facebook.com"],
    profileUrl: (handle: string) => `https://www.facebook.com/${handle}`,
  },
  instagram: {
    hosts: ["instagram.com"],
    profileUrl: (handle: string) => `https://www.instagram.com/${handle}`,
  },
  tiktok: {
    hosts: ["tiktok.com"],
    profileUrl: (handle: string) => `https://www.tiktok.com/@${handle}`,
  },
} as const;

export type ProviderSocialNetwork = keyof typeof providerSocialNetworks;

function parseHttpUrl(value: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function hostMatches(hostname: string, hosts: readonly string[]) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return hosts.some((allowed) => host === allowed);
}

/**
 * Accepts a profile URL on the network's own domain or a bare handle
 * ("@rakoto.photo") and returns an https profile URL, or null if invalid.
 */
export function normalizeSocialLink(
  network: ProviderSocialNetwork,
  raw: string,
): string | null {
  const value = raw.trim();
  if (!value) return null;
  const { hosts, profileUrl } = providerSocialNetworks[network];

  const handle = value.replace(/^@/, "");
  if (/^[A-Za-z0-9._-]{1,100}$/.test(handle) && !handle.includes("..")) {
    if (!/\.(com|de|fr|mg)$/i.test(handle)) return profileUrl(handle);
  }

  const url = parseHttpUrl(value);
  if (!url || !hostMatches(url.hostname, hosts)) return null;
  if (url.pathname === "/" || url.pathname === "") return null;
  url.protocol = "https:";
  return url.toString();
}

/** Accepts "example.de" or a full http(s) URL and returns an https URL. */
export function normalizeWebsite(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const url = parseHttpUrl(value);
  if (!url || !url.hostname.includes(".")) return null;
  return url.toString();
}
