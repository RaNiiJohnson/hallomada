import { api } from "@convex/_generated/api";
import { preloadAuthQuery } from "@/lib/auth-server";
import { fetchQuery } from "convex/nextjs";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import UserClient from "./UserClient";

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const notFound = await getTranslations({ locale, namespace: "notFound" });
  const user = await fetchQuery(api.auth.users.getUserBySlug, {
    slug,
  });

  if (!user) {
    return {
      title: notFound("title"),
    };
  }

  return {
    title: user.name,
    description: user.headline,
  };
}

export default async function UserPage({ params }: Props) {
  const { slug } = await params;
  const user = await preloadAuthQuery(api.auth.users.getUserBySlug, { slug });
  return <UserClient preloadedUser={user} />;
}
