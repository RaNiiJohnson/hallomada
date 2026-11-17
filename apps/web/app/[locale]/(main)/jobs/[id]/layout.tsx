import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params;
  const notFound = await getTranslations({ locale, namespace: "notFound" });
  const common = await getTranslations({ locale, namespace: "common" });
  const job = await fetchQuery(api.jobs.queries.getJobMetadata, {
    slug: id,
  });

  if (!job) {
    return {
      title: notFound("title"),
    };
  }

  const title = job.title;
  const socialTitle = `${title} | Hallomada`;
  // Limit description to ~160 chars for SEO best practices, removing newlines if necessary
  const description =
    job.description?.substring(0, 160) || common("jobFallbackDescription");

  return {
    title,
    description,
    openGraph: {
      title: socialTitle,
      description,
      type: "website",
      siteName: "Hallomada",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
