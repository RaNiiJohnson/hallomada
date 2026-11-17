// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  normalizePhoneNumber,
  normalizeSocialLink,
  normalizeWebsite,
  whatsappLink,
} from "./providers";

describe("normalizePhoneNumber", () => {
  it("treats national numbers as German", () => {
    expect(normalizePhoneNumber("0151 2345 6789")).toBe("+4915123456789");
    expect(normalizePhoneNumber("030/123-4567")).toBe("+49301234567");
    expect(normalizePhoneNumber("15123456789")).toBe("+4915123456789");
  });

  it("keeps international numbers", () => {
    expect(normalizePhoneNumber("+49 151 23456789")).toBe("+4915123456789");
    expect(normalizePhoneNumber("0033 6 12 34 56 78")).toBe("+33612345678");
    expect(normalizePhoneNumber("+261 34 12 345 67")).toBe("+261341234567");
  });

  it("rejects invalid input", () => {
    expect(normalizePhoneNumber("")).toBeNull();
    expect(normalizePhoneNumber("0123")).toBeNull();
    expect(normalizePhoneNumber("not a number")).toBeNull();
    expect(normalizePhoneNumber("+0151234567")).toBeNull();
  });
});

describe("whatsappLink", () => {
  it("builds a wa.me link with an encoded message", () => {
    expect(whatsappLink("+4915123456789")).toBe("https://wa.me/4915123456789");
    expect(whatsappLink("+4915123456789", "Hallo & 👋")).toBe(
      "https://wa.me/4915123456789?text=Hallo%20%26%20%F0%9F%91%8B",
    );
  });
});

describe("normalizeSocialLink", () => {
  it("turns handles into profile URLs", () => {
    expect(normalizeSocialLink("instagram", "@rakoto.photo")).toBe(
      "https://www.instagram.com/rakoto.photo",
    );
    expect(normalizeSocialLink("tiktok", "rakoto")).toBe(
      "https://www.tiktok.com/@rakoto",
    );
  });

  it("accepts profile URLs on the network's domain only", () => {
    expect(
      normalizeSocialLink("facebook", "facebook.com/rakoto.traiteur"),
    ).toBe("https://facebook.com/rakoto.traiteur");
    expect(
      normalizeSocialLink("instagram", "http://www.instagram.com/rakoto/"),
    ).toBe("https://www.instagram.com/rakoto/");
    expect(normalizeSocialLink("instagram", "https://evil.com/rakoto")).toBeNull();
    expect(
      normalizeSocialLink("facebook", "https://facebook.com.evil.com/x"),
    ).toBeNull();
    expect(normalizeSocialLink("instagram", "https://instagram.com/")).toBeNull();
    expect(normalizeSocialLink("tiktok", "javascript:alert(1)")).toBeNull();
  });
});

describe("normalizeWebsite", () => {
  it("adds https and rejects non-web URLs", () => {
    expect(normalizeWebsite("rakoto.de")).toBe("https://rakoto.de/");
    expect(normalizeWebsite("http://rakoto.de/menu")).toBe(
      "http://rakoto.de/menu",
    );
    expect(normalizeWebsite("localhost")).toBeNull();
    expect(normalizeWebsite("javascript:alert(1)")).toBeNull();
    expect(normalizeWebsite("")).toBeNull();
  });
});
