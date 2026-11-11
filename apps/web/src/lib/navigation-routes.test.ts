// @vitest-environment node

import { describe, expect, it } from "vitest";
import sitemap from "../../app/sitemap";
import {
  getAccountNavigation,
  sitemapRoutes,
} from "./navigation-routes";
import { shouldShowPostPagination } from "./post-pagination";

describe("PR 4 public navigation and pagination", () => {
  it("hides pagination for exactly one page", () => {
    expect(
      shouldShowPostPagination({ hasMore: false, hasPrevPage: false }),
    ).toBe(false);
  });

  it("shows pagination when one additional item exists", () => {
    expect(
      shouldShowPostPagination({ hasMore: true, hasPrevPage: false }),
    ).toBe(true);
  });

  it("keeps pagination visible on the final page", () => {
    expect(
      shouldShowPostPagination({ hasMore: false, hasPrevPage: true }),
    ).toBe(true);
  });

  it("links authenticated members to their private space, not a nonexistent settings route", () => {
    expect(getAccountNavigation("alice")).toEqual([
      { key: "account", href: "/me" },
      { key: "profile", href: "/hl/alice" },
    ]);
    expect(getAccountNavigation("alice")).not.toContainEqual(
      expect.objectContaining({ href: "/settings" }),
    );
  });

  it("uses the real singular listing route in the sitemap", () => {
    expect(sitemapRoutes).toContain("/listing");
    expect(sitemapRoutes).not.toContain("/listings" as never);

    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://hallomada.de/listing");
    expect(urls).not.toContain("https://hallomada.de/listings");
  });
});
