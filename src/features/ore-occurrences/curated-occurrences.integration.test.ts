import { describe, expect, it } from "vitest";
import { loadCuratedCelestialBodies } from "@/features/locations/curated-locations";
import { loadCuratedOres } from "@/features/ores/curated-ores";
import { loadCuratedOccurrences } from "./curated-occurrences";

describe("curated ore occurrences dataset", () => {
  it("loads a non-trivial starter dataset", () => {
    expect(loadCuratedOccurrences().length).toBeGreaterThanOrEqual(60);
  });

  it("has unique (ore, system, body, method, patch) tuples", () => {
    const keys = loadCuratedOccurrences().map(
      (o) =>
        `${o.oreCode}|${o.systemCode}|${o.bodySlug}|${o.method}|${o.patchVersion}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("references only existing ores and bodies", () => {
    const oreCodes = new Set(loadCuratedOres().map((o) => o.code));
    const bodies = new Map(
      loadCuratedCelestialBodies().map((b) => [`${b.systemCode}|${b.slug}`, b]),
    );

    for (const occurrence of loadCuratedOccurrences()) {
      expect(oreCodes.has(occurrence.oreCode)).toBe(true);
      expect(
        bodies.has(`${occurrence.systemCode}|${occurrence.bodySlug}`),
      ).toBe(true);
    }
  });

  it("only assigns methods the ore is mineable by", () => {
    const ores = new Map(loadCuratedOres().map((o) => [o.code, o]));

    for (const occurrence of loadCuratedOccurrences()) {
      const ore = ores.get(occurrence.oreCode);
      expect(ore?.mineableBy[occurrence.method]).toBe(true);
    }
  });

  it("marks all starter entries as low-confidence curated data", () => {
    for (const occurrence of loadCuratedOccurrences()) {
      expect(occurrence.sourceType).toBe("curated");
      expect(occurrence.confidenceScore).toBeLessThanOrEqual(0.5);
    }
  });

  it("contains the classic Daymar Hadanite FPS spot", () => {
    const hit = loadCuratedOccurrences().find(
      (o) =>
        o.oreCode === "HADA" && o.bodySlug === "daymar" && o.method === "fps",
    );
    expect(hit).toBeDefined();
  });
});
