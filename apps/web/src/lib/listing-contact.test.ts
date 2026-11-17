// @vitest-environment node

import { describe, expect, it } from "vitest";
import { getListingContactLinks } from "./listing-contact";

describe("listing contact links", () => {
  it("creates WhatsApp and email links when both contacts exist", () => {
    expect(
      getListingContactLinks({
        phone: "+49 151 23456789",
        email: "owner@example.com",
      }),
    ).toEqual({
      whatsappHref: "https://wa.me/4915123456789",
      emailHref: "mailto:owner@example.com",
    });
  });

  it("returns no action for legacy listings without contact details", () => {
    expect(getListingContactLinks(null)).toEqual({
      whatsappHref: null,
      emailHref: null,
    });
  });
});
