"use client";

import { useTranslations } from "next-intl";

import { FormPage } from "@/components/form-page";
import { RequireAuth } from "@/components/require-auth";
import { useRouter } from "@/i18n/navigation";
import { ProviderForm } from "../_components/provider-form";

export default function NewProviderPage() {
  const t = useTranslations("providers");
  const router = useRouter();

  return (
    <RequireAuth>
      <FormPage
        backHref="/providers"
        backLabel={t("details.back")}
        title={t("form.createTitle")}
        description={t("form.createDesc")}
      >
        <ProviderForm onSuccess={(slug) => router.push(`/providers/${slug}`)} />
      </FormPage>
    </RequireAuth>
  );
}
