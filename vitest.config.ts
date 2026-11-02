import { defaultExclude, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...defaultExclude, ".next", "dist"],
    projects: [
      {
        extends: true,
        test: {
          name: "convex",
          include: ["convex/**/*.test.{ts,tsx,js}"],
          environment: "edge-runtime",
          setupFiles: [
            "./convex/test.aggregates.mock.ts",
            "./convex/test.ratelimits.mock.ts",
            "./convex/test.posthog.mock.ts",
            "./convex/test.cascadeDeletes.mock.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "frontend",
          include: [
            "src/**/*.test.{ts,tsx,js,jsx}",
            "app/**/*.test.{ts,tsx,js,jsx}",
          ],
          exclude: [...defaultExclude, "convex/**"],
          environment: "jsdom",
        },
      },
    ],
  },
});
