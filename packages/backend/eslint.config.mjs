import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...nextTs,
  globalIgnores(["convex/_generated/**", "convex/betterAuth/_generated/**"]),
]);
