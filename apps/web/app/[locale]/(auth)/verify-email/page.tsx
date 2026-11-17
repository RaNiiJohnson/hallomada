"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { ArrowLeftIcon, MailIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getAuthHref, getSafeReturnTo } from "@/lib/auth-return-to";

function VerifyEmailContent() {
  const t = useTranslations("auth.verifyEmail");
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));

  return (
    <div>
      <Button variant="outline" className="absolute top-4 left-4">
        <Link href="/register" className="flex items-center">
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> {t("back")}
        </Link>
      </Button>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-4 pb-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <MailIcon className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              <p>{t("spamNote")}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("hasAccount")}{" "}
              <Link
                href={getAuthHref("/login", returnTo)}
                className="font-medium text-primary hover:underline"
              >
                {t("login")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
