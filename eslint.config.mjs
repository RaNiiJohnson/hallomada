import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".source/**",
    ".delta",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Convex generated files:
    "convex/_generated/**",
    // convex better-auth generated files:
    "convex/betterAuth/_generated/**",
  ]),
]);

export default eslintConfig;
