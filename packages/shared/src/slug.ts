/** URL slug with a short random suffix, used for every public document. */
export const generatedSlug = (slug: string) => {
  const baseSlug = slug
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");

  return `${baseSlug}_${Math.random().toString(36).substring(2, 6)}`;
};
