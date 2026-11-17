"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("profile.notFound");

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <User className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {t("description")}
          </p>
          <Link href="/communities">
            <Button className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("backButton")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
