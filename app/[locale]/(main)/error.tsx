"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { captureException } from "@/lib/analytics";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function MainError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  const t = useTranslations("common");

  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center px-6 md:px-12">
      <div className="mx-auto w-full max-w-xl space-y-4" role="alert">
        <h1 className="text-2xl font-semibold">{t("errorTitle")}</h1>
        <p className="text-muted-foreground">{t("errorDescription")}</p>
        <div className="flex gap-3">
          <Button type="button" onClick={reset}>
            {t("errorRetry")}
          </Button>
          <Button asChild variant="outline">
            <Link href="/">{t("errorHome")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
