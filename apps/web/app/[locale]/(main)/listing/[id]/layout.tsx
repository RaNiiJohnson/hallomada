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
  const listing = await fetchQuery(api.listings.queries.getListingMetadata, {
    slug: id,
  });

  if (!listing) {
    return {
      title: notFound("title"),
    };
  }

  const title = listing.title;
  const socialTitle = `${title} | Hallomada`;
  const description =
    listing.description?.substring(0, 160) ||
    common("listingFallbackDescription");
  const imageUrl = listing.images?.[0]?.url || listing.images?.[0]?.secureUrl;

  return {
    title,
    description,
    openGraph: {
      title: socialTitle,
      description,
      type: "website",
      siteName: "Hallomada",
      ...(imageUrl && {
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: listing.title,
          },
        ],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default function JobLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
