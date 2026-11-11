// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  getAuthHref,
  getCurrentReturnTo,
  getLocalizedCallbackUrl,
  getSafeReturnTo,
  POST_AUTH_DEFAULT_PATH,
} from "./auth-return-to";

describe("post-auth return destinations", () => {
  it("keeps an internal resource URL, including its query and hash", () => {
    expect(getSafeReturnTo("/jobs/job-1?source=feed#apply")).toBe(
      "/jobs/job-1?source=feed#apply",
    );
  });

  it("normalizes a locale-prefixed browser path before post-auth navigation", () => {
    expect(getSafeReturnTo("/en/jobs/job-1?source=feed#apply")).toBe(
      "/jobs/job-1?source=feed#apply",
    );
    expect(getLocalizedCallbackUrl("en", "/en/jobs/job-1")).toBe(
      "/en/jobs/job-1",
    );
  });

  it.each(["https://example.com", "//example.com", "javascript:alert(1)", null])(
    "falls back for an unsafe destination: %s",
    (returnTo) => {
      expect(getSafeReturnTo(returnTo)).toBe(POST_AUTH_DEFAULT_PATH);
    },
  );

  it("preserves the return destination across auth links and callbacks", () => {
    expect(getAuthHref("/login", "/listing/a-home")).toBe(
      "/login?returnTo=%2Flisting%2Fa-home",
    );
    expect(getLocalizedCallbackUrl("fr", "/listing/a-home")).toBe(
      "/fr/listing/a-home",
    );
  });

  it("keeps the full current browser location for protected action redirects", () => {
    expect(
      getCurrentReturnTo({
        pathname: "/de/jobs/job-1",
        search: "?source=feed",
        hash: "#apply",
      }),
    ).toBe("/jobs/job-1?source=feed#apply");
  });
});
