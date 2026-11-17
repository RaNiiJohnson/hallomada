export function getAccountNavigation(slug: string | null | undefined) {
  return slug
    ? [
        { key: "account" as const, href: "/me" },
        { key: "profile" as const, href: `/hl/${slug}` },
      ]
    : [{ key: "account" as const, href: "/me" }];
}

export const sitemapRoutes = [
  "",
  "/jobs",
  "/listing",
  "/communities",
  "/privacy",
  "/terms",
  "/legal-notice",
  "/contact",
  "/pricing",
] as const;
