"use client";
import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export default function BackButton() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  return (
    <Button
      onClick={router.back}
      variant="outline"
      className="absolute top-4 left-4"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {t("back")}
    </Button>
  );
}
