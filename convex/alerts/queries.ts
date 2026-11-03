import { v } from "convex/values";
import schema from "../schema";
import { authQuery } from "../functions";
import { MAX_ALERTS_PER_USER } from "./values";

export const listMine = authQuery({
  args: {},
  returns: v.array(schema.doc("alerts")),
  handler: async (ctx) =>
    await ctx.db
      .query("alerts")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .take(MAX_ALERTS_PER_USER),
});
