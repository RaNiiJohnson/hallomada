import { v, type Infer } from "convex/values";

export const listingPropertyTypeValidator = v.union(
  v.literal("room"),
  v.literal("apartment"),
  v.literal("house"),
  v.literal("studio"),
  v.literal("shared"),
);

export const jobTypeValidator = v.union(
  v.literal("auPair"),
  v.literal("training"),
  v.literal("voluntary"),
  v.literal("internship"),
  v.literal("miniJob"),
  v.literal("job"),
  v.literal("freelance"),
  v.literal("scholarship"),
);

export const jobWorkModeValidator = v.union(
  v.literal("onSite"),
  v.literal("hybrid"),
  v.literal("remote"),
);

export const alertLocaleValidator = v.union(
  v.literal("fr"),
  v.literal("en"),
  v.literal("de"),
);

/** Criteria a member can set. Every field is optional: empty means "any". */
export const alertCriteriaValidator = v.union(
  v.object({
    kind: v.literal("listing"),
    city: v.optional(v.string()),
    listingMode: v.optional(v.union(v.literal("rent"), v.literal("sale"))),
    propertyType: v.optional(listingPropertyTypeValidator),
    maxPrice: v.optional(v.number()),
  }),
  v.object({
    kind: v.literal("job"),
    city: v.optional(v.string()),
    jobType: v.optional(jobTypeValidator),
    workMode: v.optional(jobWorkModeValidator),
  }),
);

export type AlertCriteria = Infer<typeof alertCriteriaValidator>;

export const MAX_ALERTS_PER_USER = 10;
export const MAX_ALERT_CITY_LENGTH = 80;
export const MAX_ALERT_PRICE = 10_000_000;

/** "  Münster " → "munster", so typing differences still match. */
export function normalizeCity(city: string | undefined | null) {
  return (city ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
