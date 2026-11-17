import { v } from "convex/values";

export const languageValidator = v.union(
  v.literal("fr"),
  v.literal("en"),
  v.literal("de"),
);
