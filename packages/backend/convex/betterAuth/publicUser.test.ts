import { describe, expect, it } from "vitest";
import type { Doc } from "./_generated/dataModel";
import { projectPublicUser } from "./publicUser";

const user = {
  _id: "user_1",
  _creationTime: 1,
  name: "Ada",
  email: "ada@example.com",
  emailVerified: true,
  createdAt: 1,
  updatedAt: 1,
  slug: "ada",
  headline: "Engineer",
  bio: "Private biography",
  isPublic: true,
  showEmail: false,
  showPhone: true,
  cv: "cv/private-key.pdf",
  banned: true,
  banReason: "internal",
  banExpires: 123,
} as Doc<"user">;

describe("public user projection", () => {
  it("never exposes Better Auth, moderation, phone or CV internals", () => {
    const result = projectPublicUser(user);
    expect(result).not.toBeNull();
    if (!result) throw new Error("Expected public profile projection");

    expect(result.email).toBeUndefined();
    expect(result).not.toHaveProperty("cv");
    expect(result).not.toHaveProperty("banned");
    expect(result).not.toHaveProperty("banReason");
    expect(result).not.toHaveProperty("banExpires");
    expect(result).not.toHaveProperty("emailVerified");
    expect(result).not.toHaveProperty("showPhone");
  });

  it("keeps a public profile minimal even when the owner enabled email visibility", () => {
    const result = projectPublicUser({ ...user, showEmail: true, city: "Berlin" });
    expect(result).not.toBeNull();
    if (!result) throw new Error("Expected public profile projection");

    expect(result).toMatchObject({ name: "Ada", city: "Berlin" });
    expect(result.email).toBeUndefined();
    expect(result.headline).toBeUndefined();
    expect(result.bio).toBeUndefined();
    expect(result.skills).toBeUndefined();
  });

  it("hides detailed fields for a private profile visitor", () => {
    const result = projectPublicUser({ ...user, isPublic: false });

    expect(result).toBeNull();
  });

  it("returns editable profile data to the owner without revealing the CV key", () => {
    const result = projectPublicUser(user, { viewerId: "user_1" });

    expect(result?.email).toBe("ada@example.com");
    expect(result?.hasCv).toBe(true);
    expect(result).not.toHaveProperty("cv");
  });

  it("returns a private profile only to its owner", () => {
    const result = projectPublicUser(
      { ...user, isPublic: false },
      { viewerId: "user_1" },
    );

    expect(result).toMatchObject({
      _id: "user_1",
      name: "Ada",
      slug: "ada",
      isPublic: false,
      headline: "Engineer",
      bio: "Private biography",
      email: "ada@example.com",
    });
  });
});
