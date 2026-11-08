import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import type { Locale } from "./routing";

const namespaces = ['home', 'pricing', 'footer', 'localeSwitcher', 'sidebar', 'faq', 'communities', 'sortMode', 'time', 'common', 'jobs', 'listing', 'auth', 'profile', 'me', 'notFound', 'notifications', 'admin', 'reports', 'consent', 'legal', 'providers', 'rentalFile', 'applicationQuota'];

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  const messages: Record<string, unknown> = {};
  for (const ns of namespaces) {
    try {
      messages[ns] = (await import(`../../messages/${locale}/${ns}.json`)).default;
    } catch {
      console.warn(`Could not load namespace ${ns} for locale ${locale}`);
    }
  }

  return {
    locale,
    messages,
  };
});
