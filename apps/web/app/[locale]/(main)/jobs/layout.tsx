import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {
    title: t("jobsTitle"),
    description: t("jobsDescription"),
  };
}

export default function JobsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
