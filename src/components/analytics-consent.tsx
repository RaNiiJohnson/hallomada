"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  type AnalyticsConsent,
  readConsent,
  subscribeConsent,
  writeConsent,
} from "@/lib/analytics-consent";
import { disableAnalytics, enableAnalytics } from "@/lib/analytics";
import { Analytics } from "@vercel/analytics/next";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

export function useAnalyticsConsent(): AnalyticsConsent | null | undefined {
  return useSyncExternalStore(
    subscribeConsent,
    readConsent,
    () => undefined,
  );
}

const OPEN_EVENT = "hallomada:open-cookie-settings";

export function CookieSettingsButton({ className }: { className?: string }) {
  const t = useTranslations("consent");
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    >
      {t("manage")}
    </button>
  );
}

/** Starts/stops optional analytics according to the stored choice. */
export function AnalyticsConsentManager() {
  const t = useTranslations("consent");
  const consent = useAnalyticsConsent();
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    if (consent === "granted") enableAnalytics();
    else if (consent === "denied") disableAnalytics();
  }, [consent]);

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const choose = (value: AnalyticsConsent) => {
    writeConsent(value);
    setReopened(false);
  };

  const visible = consent === null || (reopened && consent !== undefined);

  return (
    <>
      {consent === "granted" && <Analytics />}
      {visible && (
        <div
          role="dialog"
          aria-labelledby="consent-title"
          className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-4 shadow-lg"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm">
              <p id="consent-title" className="font-semibold">
                {t("title")}
              </p>
              <p className="text-muted-foreground">
                {t("description")}{" "}
                <Link href="/privacy" className="underline">
                  {t("learnMore")}
                </Link>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => choose("denied")}>
                {t("refuse")}
              </Button>
              <Button variant="outline" onClick={() => choose("granted")}>
                {t("accept")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
