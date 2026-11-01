"use client";

import { useTranslations } from "next-intl";

import { FormPage } from "@/components/form-page";
import { RequireAuth } from "@/components/require-auth";
import { useRouter } from "@/i18n/navigation";
import { ListingForm } from "../_component/forms/listingForm";

export default function NewListingPage() {
  const t = useTranslations("listing");
  const router = useRouter();

  return (
    <RequireAuth>
      <FormPage
        backHref="/listing"
        backLabel={t("details.backBtn")}
        title={t("dialogs.publish.title")}
        description={t("dialogs.publish.desc")}
      >
        <ListingForm onSuccess={() => router.push("/listing")} />
      </FormPage>
    </RequireAuth>
  );
}
