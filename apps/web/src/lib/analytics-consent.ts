export type AnalyticsConsent = "granted" | "denied";

export const CONSENT_STORAGE_KEY = "hallomada:analytics-consent";
const CONSENT_EVENT = "hallomada:analytics-consent-change";

export function parseConsent(value: string | null): AnalyticsConsent | null {
  return value === "granted" || value === "denied" ? value : null;
}

export function readConsent(): AnalyticsConsent | null {
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeConsent(consent: AnalyticsConsent | null) {
  try {
    if (consent) window.localStorage.setItem(CONSENT_STORAGE_KEY, consent);
    else window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // Storage unavailable: the choice only lives for this page view.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function subscribeConsent(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
