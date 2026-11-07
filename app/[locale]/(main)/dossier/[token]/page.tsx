import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RentalFileView } from "./rental-file-view";

type Props = { params: Promise<{ locale: string; token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "rentalFile.view" });
  // Private page: reachable only with the link the landlord received.
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function Page({ params }: Props) {
  const { token } = await params;
  return <RentalFileView token={token} />;
}
