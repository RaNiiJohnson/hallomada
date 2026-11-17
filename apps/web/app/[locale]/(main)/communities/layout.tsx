import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {
    title: t("communityTitle"),
    description: t("communityDescription"),
  };
}

export default function CommunitiesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
