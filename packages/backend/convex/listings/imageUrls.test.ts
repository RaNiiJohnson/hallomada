import { describe, expect, it, vi } from "vitest";
import { resolveListingImages } from "./imageUrls";

describe("listing image URL resolution", () => {
  it("resolves current R2 storage keys for Open Graph consumers", async () => {
    const getStorageUrl = vi
      .fn()
      .mockResolvedValue("https://r2.example.test/signed-listing.jpg");

    await expect(
      resolveListingImages(
        [{ storageId: "listing/current.jpg" }],
        getStorageUrl,
      ),
    ).resolves.toEqual([
      {
        storageId: "listing/current.jpg",
        url: "https://r2.example.test/signed-listing.jpg",
      },
    ]);
    expect(getStorageUrl).toHaveBeenCalledWith("listing/current.jpg");
  });

  it("keeps legacy Cloudinary URLs compatible", async () => {
    const getStorageUrl = vi.fn();
    await expect(
      resolveListingImages(
        [{ secureUrl: "https://legacy.example.test/listing.jpg" }],
        getStorageUrl,
      ),
    ).resolves.toEqual([
      {
        secureUrl: "https://legacy.example.test/listing.jpg",
        url: "https://legacy.example.test/listing.jpg",
      },
    ]);
    expect(getStorageUrl).not.toHaveBeenCalled();
  });
});
