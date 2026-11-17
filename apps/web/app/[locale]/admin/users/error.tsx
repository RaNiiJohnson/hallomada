"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function UsersError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("admin.users.error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md rounded-xl border bg-card p-8 text-center">
        <AlertTriangle className="mx-auto size-8 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">{t("title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("description")}
        </p>
        <Button onClick={retry} className="mt-5">
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
