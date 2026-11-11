export type ListingImage = {
  storageId?: string;
  url?: string;
  publicId?: string;
  secureUrl?: string;
};

export async function resolveListingImages(
  images: ListingImage[],
  getStorageUrl: (key: string) => Promise<string | null>,
) {
  return await Promise.all(
    images.map(async (image) => {
      if (!image.storageId) {
        return { ...image, url: image.secureUrl ?? image.url ?? "" };
      }
      return {
        ...image,
        url:
          (await getStorageUrl(image.storageId)) ??
          image.secureUrl ??
          image.url ??
          "",
      };
    }),
  );
}
