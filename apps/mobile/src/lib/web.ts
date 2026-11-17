import * as WebBrowser from 'expo-web-browser';

/** Public web app origin (the Next.js site), used for share links and web-only flows. */
export const siteUrl = process.env.EXPO_PUBLIC_SITE_URL;

/** Absolute French web URL for a path such as `/jobs/my-slug`. */
export function webUrl(path: string) {
  return siteUrl ? `${siteUrl}/fr${path}` : undefined;
}

/** Opens a web-only page (e.g. a flow the app does not have yet) in the in-app browser. */
export function openWeb(path: string) {
  const url = webUrl(path);
  if (url) void WebBrowser.openBrowserAsync(url);
}

/** Only http(s) links are opened, like getSafeExternalUrl on the web. */
export function safeExternalUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
