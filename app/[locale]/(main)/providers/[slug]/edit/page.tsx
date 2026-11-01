"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { notFound, useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { FormPage } from "@/components/form-page";
import { RequireAuth } from "@/components/require-auth";
import { useRouter } from "@/i18n/navigation";
import { ProviderForm } from "../../_components/provider-form";

export default function EditProviderPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useTranslations("providers");
  const router = useRouter();
  const provider = useQuery(api.providers.queries.getProviderBySlug, { slug });

  return (
    <RequireAuth>
      {provider === undefined ? null : provider === null ||
        !provider.canManage ? (
        notFound()
      ) : (
        <FormPage
          backHref={`/providers/${slug}`}
          backLabel={provider.name}
          title={t("form.editTitle")}
          description={t("form.editDesc")}
        >
          <ProviderForm
            provider={provider}
            onSuccess={() => router.push(`/providers/${slug}`)}
          />
        </FormPage>
      )}
    </RequireAuth>
  );
}
