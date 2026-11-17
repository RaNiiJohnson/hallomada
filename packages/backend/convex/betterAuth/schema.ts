import { defineSchema } from "convex/server";
import { tables } from "./generatedSchema";

const schema = defineSchema({
  ...tables,
  user: tables.user
    .index("by_slug", ["slug"])
    .index("by_role", ["role"])
    .index("by_banned", ["banned"])
    .index("by_createdAt", ["createdAt"]),
});

export default schema;
