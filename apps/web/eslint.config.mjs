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
    // Copied from node_modules on postinstall:
    "public/maplibre-gl-worker.mjs",
  ]),
]);

export default eslintConfig;
