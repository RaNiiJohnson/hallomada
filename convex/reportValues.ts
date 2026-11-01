import { v } from "convex/values";

export const reportReasonValidator = v.union(
  v.literal("spam"),
  v.literal("fraud"),
  v.literal("harassment"),
  v.literal("hate"),
  v.literal("dangerous"),
  v.literal("misinformation"),
  v.literal("other"),
);

export const reportStatusValidator = v.union(
  v.literal("new"),
  v.literal("handled"),
);

export const reportTargetValidator = v.union(
  v.object({ type: v.literal("post"), id: v.id("posts") }),
  v.object({ type: v.literal("job"), id: v.id("JobOffer") }),
  v.object({
    type: v.literal("listing"),
    id: v.id("RealestateListing"),
  }),
  v.object({ type: v.literal("community"), id: v.id("communities") }),
  v.object({ type: v.literal("provider"), id: v.id("providers") }),
);

export const reportTargetTypeValidator = v.union(
  v.literal("post"),
  v.literal("job"),
  v.literal("listing"),
  v.literal("community"),
  v.literal("provider"),
);

export const reportTargetIdValidator = v.union(
  v.id("posts"),
  v.id("JobOffer"),
  v.id("RealestateListing"),
  v.id("communities"),
  v.id("providers"),
);
