import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: "providers" });
  const provider = await fetchQuery(api.providers.queries.getProviderMetadata, {
    slug,
  });

  // Pending or hidden pages are only visible to their owner, client-side.
  if (!provider) {
    return { title: t("metaTitle"), robots: { index: false } };
  }

  const title = provider.tagline
    ? `${provider.name} – ${provider.tagline}`
    : provider.name;
  const socialTitle = `${title} | Hallomada`;
  const description = `${provider.city} · ${provider.description.substring(0, 140)}`;
  const imageUrl = provider.imageUrl;

  return {
    title,
    description,
    openGraph: {
      title: socialTitle,
      description,
      type: "website",
      siteName: "Hallomada",
      ...(imageUrl && {
        images: [{ url: imageUrl, width: 1200, height: 630, alt: provider.name }],
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

export default function ProviderLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
