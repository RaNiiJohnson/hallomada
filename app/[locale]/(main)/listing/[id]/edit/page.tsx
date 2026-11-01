"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { notFound, useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { FormPage } from "@/components/form-page";
import { RequireAuth } from "@/components/require-auth";
import { useRouter } from "@/i18n/navigation";
import { ListingForm } from "../../_component/forms/listingForm";

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("listing");
  const router = useRouter();
  const user = useQuery(api.auth.auth.getCurrentUser);
  const listing = useQuery(api.listings.queries.getListingWithContact, {
    slug: id,
  });

  return (
    <RequireAuth>
      {listing === undefined || user === undefined ? null : listing === null ||
        user?._id !== listing.authorId ? (
        notFound()
      ) : (
        <FormPage
          backHref={`/listing/${id}`}
          backLabel={t("details.backBtn")}
          title={t("dialogs.edit.title")}
          description={t("dialogs.edit.description")}
        >
          <ListingForm
            listing={listing}
            onSuccess={() => router.push(`/listing/${id}`)}
          />
        </FormPage>
      )}
    </RequireAuth>
  );
}
