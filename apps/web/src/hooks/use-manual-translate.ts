import { useRef, useState } from "react";

export const supportedTranslationLanguages = ["fr", "en", "de"] as const;

export type SupportedLang = (typeof supportedTranslationLanguages)[number];

export function getSupportedTranslationLanguage(
  value: string,
): SupportedLang | null {
  return (supportedTranslationLanguages as readonly string[]).includes(value)
    ? (value as SupportedLang)
    : null;
}

/** Only a translation produced from the current resource version is usable. */
export function getFreshTranslation<T extends { sourceUpdatedAt: number }>(
  translation: T | null | undefined,
  sourceUpdatedAt: number | undefined,
): T | null {
  return translation && sourceUpdatedAt === translation.sourceUpdatedAt
    ? translation
    : null;
}

/**
 * On-demand translation (lists): nothing happens until the user
 * selects a language. `run` calls the resource's Convex action.
 */
export function useManualTranslate<T>(
  run: (lang: SupportedLang) => Promise<T>,
  options?: {
    onError?: () => void;
    initialTranslation?: { lang: SupportedLang; data: T } | null;
    loadCached?: (lang: SupportedLang) => Promise<T | null>;
  },
) {
  const [result, setResult] = useState<{ lang: SupportedLang; data: T } | null>(
    null,
  );
  const [pendingLang, setPendingLang] = useState<SupportedLang | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const requestId = useRef(0); // ignore outdated responses (rapid clicks)

  const selectTranslation = async (
    lang: SupportedLang,
    access: { canCreate: boolean; onCreateRequired: () => void },
  ) => {
    const id = ++requestId.current;
    setPendingLang(lang);
    try {
      const cached = await options?.loadCached?.(lang);
      if (id !== requestId.current) return;
      if (cached) {
        setShowOriginal(false);
        setResult({ lang, data: cached });
        return;
      }
      if (!access.canCreate) {
        access.onCreateRequired();
        return;
      }
      const data = await run(lang);
      if (id === requestId.current) {
        setShowOriginal(false);
        setResult({ lang, data });
      }
    } catch {
      if (id === requestId.current) options?.onError?.();
    } finally {
      if (id === requestId.current) setPendingLang(null);
    }
  };

  const reset = () => {
    requestId.current++;
    setResult(null);
    setPendingLang(null);
    setShowOriginal(true);
  };

  const displayed = result ?? (!showOriginal ? options?.initialTranslation : null);

  return {
    data: displayed?.data ?? null,
    activeLang: displayed?.lang ?? null,
    pendingLang,
    selectTranslation,
    reset,
  };
}
