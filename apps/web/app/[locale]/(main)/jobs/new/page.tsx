"use client";

import { useTranslations } from "next-intl";

import { FormPage } from "@/components/form-page";
import { RequireAuth } from "@/components/require-auth";
import { useRouter } from "@/i18n/navigation";
import { JobOfferForm } from "../_component/forms/jobOfferForm";

export default function NewJobPage() {
  const t = useTranslations("jobs");
  const router = useRouter();

  return (
    <RequireAuth>
      <FormPage
        backHref="/jobs"
        backLabel={t("details.backToList")}
        title={t("dialogs.publish.title")}
        description={t("dialogs.publish.desc")}
      >
        <JobOfferForm onSuccess={() => router.push("/jobs")} />
      </FormPage>
    </RequireAuth>
  );
}
