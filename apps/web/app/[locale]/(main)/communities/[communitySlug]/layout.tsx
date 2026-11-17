import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

interface Props {
  params: Promise<{ communitySlug: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communitySlug, locale } = await params;
  const notFound = await getTranslations({ locale, namespace: "notFound" });
  const community = await fetchQuery(api.communities.queries.getCommunity, {
    slug: communitySlug,
  });

  if (!community) {
    return {
      title: notFound("title"),
    };
  }

  const title = community.name;
  const socialTitle = `${title} | Hallomada`;
  const description = community.description?.substring(0, 160) || "";

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
