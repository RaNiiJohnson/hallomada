"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { notFound, useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { FormPage } from "@/components/form-page";
import { RequireAuth } from "@/components/require-auth";
import { useRouter } from "@/i18n/navigation";
import { EditJobOfferForm } from "../_component/editJobOfferForm";

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("jobs");
  const router = useRouter();
  const user = useQuery(api.auth.auth.getCurrentUser);
  const jobOffer = useQuery(api.jobs.queries.getJobWithContact, { slug: id });

  return (
    <RequireAuth>
      {jobOffer === undefined || user === undefined ? null : jobOffer ===
          null || user?._id !== jobOffer.authorId ? (
        notFound()
      ) : (
        <FormPage
          backHref={`/jobs/${id}`}
          backLabel={t("details.backToList")}
          title={t("dialogs.edit.title")}
          description={t("dialogs.edit.description")}
        >
          <EditJobOfferForm
            jobOffer={jobOffer}
            onSuccess={() => router.push(`/jobs/${id}`)}
          />
        </FormPage>
      )}
    </RequireAuth>
  );
}
