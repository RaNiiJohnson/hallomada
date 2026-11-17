"use client";

import { AuthBrand } from "@/components/auth/auth-brand";
import BackButton from "@/components/backButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getAuthHref, getSafeReturnTo } from "@/lib/auth-return-to";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SigninForm } from "./signin-form";

function SigninPageContent() {
  const t = useTranslations("auth.login");
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));

  return (
    <div>
      <BackButton />
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-4 pb-8 text-center">
            <AuthBrand />
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <SigninForm returnTo={returnTo} />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t("noAccount")}{" "}
                <Link
                  href={getAuthHref("/register", returnTo)}
                  className="font-medium text-primary hover:underline"
                >
                  {t("signUp")}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SigninPage() {
  return (
    <Suspense>
      <SigninPageContent />
    </Suspense>
  );
}
