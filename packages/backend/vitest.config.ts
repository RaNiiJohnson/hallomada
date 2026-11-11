import { defaultExclude, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "convex",
    include: ["convex/**/*.test.{ts,tsx,js}"],
    exclude: [...defaultExclude, "dist"],
    environment: "edge-runtime",
    setupFiles: [
      "./convex/test.aggregates.mock.ts",
      "./convex/test.ratelimits.mock.ts",
      "./convex/test.posthog.mock.ts",
      "./convex/test.cascadeDeletes.mock.ts",
    ],
  },
});
