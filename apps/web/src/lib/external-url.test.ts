// @vitest-environment node

import { describe, expect, it } from "vitest";
import { getSafeExternalUrl } from "./external-url";

describe("getSafeExternalUrl", () => {
  it("keeps HTTP and HTTPS application links", () => {
    expect(getSafeExternalUrl("https://example.com/apply")).toBe(
      "https://example.com/apply",
    );
    expect(getSafeExternalUrl("http://example.com/apply")).toBe(
      "http://example.com/apply",
    );
  });

  it("rejects missing, malformed, and executable links", () => {
    expect(getSafeExternalUrl(undefined)).toBeNull();
    expect(getSafeExternalUrl("not a URL")).toBeNull();
    expect(getSafeExternalUrl("javascript:alert(1)")).toBeNull();
  });
});
