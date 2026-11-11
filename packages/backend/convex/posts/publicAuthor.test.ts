import { describe, expect, it } from "vitest";
import { publicAuthorOrFallback } from "./publicAuthor";

describe("publicAuthorOrFallback", () => {
  it("keeps public feeds readable after an author is deleted", () => {
    expect(
      publicAuthorOrFallback(null, {
        authorId: "deleted-user-id",
        authorName: "Former member",
      }),
    ).toEqual({
      _id: "deleted-user-id",
      name: "Former member",
      slug: null,
      isPublic: false,
      showEmail: false,
    });
  });

  it("uses an explicit neutral label for legacy posts without a name", () => {
    expect(
      publicAuthorOrFallback(null, { authorId: "deleted-user-id" }).name,
    ).toBe("Deleted user");
  });
});
