import type { Doc } from "@convex/_generated/dataModel";

/**
 * URL that reruns a saved search on the housing or jobs page. The city goes
 * into the text search (it is part of the indexed text); the other criteria
 * map to the page's filter parameters.
 */
export function savedSearchHref(search: Doc<"alerts">) {
  const params = new URLSearchParams();
  const text = [search.keywords, search.city].filter(Boolean).join(" ");
  if (text) params.set("search", text);

  if (search.kind === "listing") {
    if (search.propertyType) params.set("type", search.propertyType);
    if (search.maxPrice !== undefined) params.set("maxPrice", String(search.maxPrice));
    if (search.listingMode) params.set("mode", search.listingMode);
  } else {
    if (search.jobType) params.set("type", search.jobType);
    if (search.workMode) params.set("workMode", search.workMode);
  }

  const query = params.toString();
  const path = search.kind === "listing" ? "/listing" : "/jobs";
  return query ? `${path}?${query}` : path;
}
