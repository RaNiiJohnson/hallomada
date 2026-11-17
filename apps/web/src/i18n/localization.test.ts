// @vitest-environment node

import { describe, expect, it } from "vitest";

const translations = import.meta.glob(
  ["../../messages/fr/*.json", "../../messages/en/*.json", "../../messages/de/*.json"],
  { eager: true, import: "default" },
) as Record<string, unknown>;

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale key parity", () => {
  it("keeps French, English, and German namespaces and keys identical", () => {
    const frenchPaths = Object.keys(translations)
      .filter((path) => path.includes("/fr/"))
      .sort();

    expect(frenchPaths.length).toBeGreaterThan(0);
    for (const frenchPath of frenchPaths) {
      const englishPath = frenchPath.replace("/fr/", "/en/");
      const germanPath = frenchPath.replace("/fr/", "/de/");
      expect(translations[englishPath], `${englishPath} is missing`).toBeDefined();
      expect(translations[germanPath], `${germanPath} is missing`).toBeDefined();

      const frenchKeys = leafKeys(translations[frenchPath]).sort();
      expect(leafKeys(translations[englishPath]).sort()).toEqual(frenchKeys);
      expect(leafKeys(translations[germanPath]).sort()).toEqual(frenchKeys);
    }
  });
});
