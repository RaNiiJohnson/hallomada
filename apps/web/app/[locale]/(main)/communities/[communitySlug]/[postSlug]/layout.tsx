import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

interface Props {
  params: Promise<{ communitySlug: string; postSlug: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postSlug, locale } = await params;
  const notFound = await getTranslations({ locale, namespace: "notFound" });
  const post = await fetchQuery(api.posts.queries.getPostWithMeta, {
    slug: postSlug,
  });

  if (!post) {
    return {
      title: notFound("title"),
    };
  }

  const title = post.title;
  const socialTitle = `${title} | Hallomada`;
  const description = post.content?.substring(0, 160) || "";

  return {
    title,
    description,
    openGraph: {
      title: socialTitle,
      description,
      type: "article",
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
