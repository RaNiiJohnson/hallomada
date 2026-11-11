import { describe, expect, it } from "vitest";
import { assertEmailVerified } from "./auth";

describe("email verification guard", () => {
  it("rejects members whose email has not been verified", () => {
    expect(() => assertEmailVerified({ emailVerified: false })).toThrow(
      "Email verification required",
    );
  });

  it("allows verified members", () => {
    expect(() => assertEmailVerified({ emailVerified: true })).not.toThrow();
  });
});
