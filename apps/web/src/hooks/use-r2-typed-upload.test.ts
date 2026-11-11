// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { uploadTypedFile } from "./use-r2-typed-upload";

describe("typed R2 upload client", () => {
  it("uploads an accepted image and verifies metadata before returning its key", async () => {
    const file = new File(["image"], "avatar.png", { type: "image/png" });
    const generateUrl = vi.fn().mockResolvedValue({
      key: "profile/avatar.png",
      url: "https://upload.example.test/avatar.png",
    });
    const syncMetadata = vi.fn().mockResolvedValue(null);
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      uploadTypedFile(
        file,
        generateUrl,
        syncMetadata,
        { accept: "image/jpeg,image/png,image/webp,image/avif" },
        request as typeof fetch,
      ),
    ).resolves.toBe("profile/avatar.png");

    expect(generateUrl).toHaveBeenCalledWith({ contentType: "image/png" });
    expect(request).toHaveBeenCalledWith(
      "https://upload.example.test/avatar.png",
      expect.objectContaining({ method: "PUT", body: file }),
    );
    expect(syncMetadata).toHaveBeenCalledWith({ key: "profile/avatar.png" });
  });

  it("rejects an unsupported file before requesting an upload URL", async () => {
    const file = new File(["payload"], "payload.svg", {
      type: "image/svg+xml",
    });
    const generateUrl = vi.fn();

    await expect(
      uploadTypedFile(file, generateUrl, vi.fn(), {
        accept: "image/jpeg,image/png,image/webp,image/avif",
      }),
    ).rejects.toThrow("File type not allowed");
    expect(generateUrl).not.toHaveBeenCalled();
  });
});
