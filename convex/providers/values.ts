import { v } from "convex/values";

export const providerCategoryValidator = v.union(
  v.literal("food"),
  v.literal("photo"),
  v.literal("beauty"),
  v.literal("events"),
  v.literal("fashion"),
  v.literal("transport"),
  v.literal("lessons"),
  v.literal("digital"),
  v.literal("other"),
);

export const providerServiceModeValidator = v.union(
  v.literal("atProvider"),
  v.literal("atClient"),
  v.literal("online"),
);

export const providerServiceValidator = v.object({
  name: v.string(),
  price: v.optional(v.string()),
});
