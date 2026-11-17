import { defineConfig, defineDocs, frontmatterSchema } from "fumadocs-mdx/config";
import { z } from "zod";

// Internal documentation shown in the admin panel (/admin/docs).
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema.extend({
      // Shown in a different color in the docs navigation until reviewed.
      new: z.boolean().default(false),
    }),
  },
});

export default defineConfig();
