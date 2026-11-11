import { fileURLToPath } from "node:url";
import { defaultExclude, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the tsconfig path aliases used by the app code.
    alias: {
      "@convex": fileURLToPath(
        new URL("../../packages/backend/convex", import.meta.url),
      ),
      "@app": fileURLToPath(new URL("./app", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    name: "web",
    include: ["src/**/*.test.{ts,tsx,js,jsx}", "app/**/*.test.{ts,tsx,js,jsx}"],
    exclude: [...defaultExclude, ".next", "dist"],
    environment: "node",
  },
});
