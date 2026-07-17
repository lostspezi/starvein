import { describe, expect, it } from "vitest";
import { loadMessages } from "./messages";

type Messages = Record<string, unknown>;

/** Alle Blatt-Pfade eines Message-Baums ("meta.ores.title", …). */
function leafPaths(node: Messages, prefix = ""): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      return leafPaths(value as Messages, path);
    }
    return [path];
  });
}

describe("message bundles", () => {
  it("de and en contain exactly the same keys", () => {
    const de = leafPaths(loadMessages("de")).sort();
    const en = leafPaths(loadMessages("en")).sort();

    const missingInDe = en.filter((path) => !de.includes(path));
    const missingInEn = de.filter((path) => !en.includes(path));

    expect(missingInDe, "keys missing in de").toEqual([]);
    expect(missingInEn, "keys missing in en").toEqual([]);
  });
});
