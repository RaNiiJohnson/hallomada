// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  getAdminIdentity,
  getAdminNavigation,
  getPostHogDashboardUrl,
  RETIRED_ADMIN_ROUTES,
} from "./admin-navigation";

describe("admin V1 navigation", () => {
  it("contains only real internal admin destinations", () => {
    const navigation = getAdminNavigation(undefined);

    expect(navigation).toEqual([
      { key: "dashboard", href: "/admin", external: false },
      { key: "users", href: "/admin/users", external: false },
      { key: "moderation", href: "/admin/moderation", external: false },
      { key: "audit", href: "/admin/audit", external: false },
      { key: "quotas", href: "/admin/quotas", external: false },
      { key: "docs", href: "/admin/docs", external: false },
    ]);
    expect(navigation.map((item) => item.href)).not.toEqual(
      expect.arrayContaining([...RETIRED_ADMIN_ROUTES]),
    );
  });

  it("shows PostHog only for a configured HTTP(S) dashboard URL", () => {
    expect(getAdminNavigation(undefined)).not.toContainEqual(
      expect.objectContaining({ key: "analytics" }),
    );
    expect(getAdminNavigation("javascript:alert(1)")).not.toContainEqual(
      expect.objectContaining({ key: "analytics" }),
    );
    expect(
      getAdminNavigation("https://eu.posthog.com/project/1/dashboard/2"),
    ).toContainEqual({
      key: "analytics",
      href: "https://eu.posthog.com/project/1/dashboard/2",
      external: true,
    });
    expect(getPostHogDashboardUrl("not a url")).toBeNull();
  });

  it("uses the authenticated administrator identity", () => {
    expect(
      getAdminIdentity(
        {
          name: "Ada Admin",
          email: "ada@example.com",
          image: "https://example.com/ada.png",
        },
        "Loading",
      ),
    ).toEqual({
      name: "Ada Admin",
      email: "ada@example.com",
      image: "https://example.com/ada.png",
    });
    expect(getAdminIdentity(undefined, "Loading")).toEqual({
      name: "Loading",
      email: "",
      image: "",
    });
  });
});
