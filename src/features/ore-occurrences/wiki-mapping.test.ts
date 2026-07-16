import { describe, expect, it } from "vitest";
import type { CelestialBody } from "@/features/locations/locations.schema";
import type { Ore } from "@/features/ores/ores.schema";
import {
  buildUuidToBodyMap,
  mapWikiOccurrences,
  shortGameVersion,
} from "./wiki-mapping";

const WALA_UUID = "10000000-0000-4000-8000-000000000004";
const LORVILLE_UUID = "10000000-0000-4000-8000-000000000006";

const bodies: CelestialBody[] = [
  {
    slug: "wala",
    systemCode: "STANTON",
    type: "moon",
    name: "Wala",
    parentSlug: "arccorp",
    wikiUuid: WALA_UUID,
  },
  // Body ohne wikiUuid (Altbestand) darf die Map nicht vergiften
  {
    slug: "legacy-moon",
    systemCode: "STANTON",
    type: "moon",
    name: "Legacy Moon",
    parentSlug: null,
  },
];

const gem: Ore = {
  code: "HADA",
  name_de: "Hadanite",
  name_en: "Hadanite",
  rarityTier: "epic",
  mineableBy: { ship: false, roc: true, fps: true },
};

function walaEntry(overrides = {}) {
  return {
    uuid: WALA_UUID,
    name: "Wala",
    system: "Stanton System",
    type: "Moon",
    parent_uuid: null,
    group_probability_percent: 25,
    relative_probability_percent: 6,
    ...overrides,
  };
}

describe("shortGameVersion", () => {
  it("strips channel and build number", () => {
    expect(shortGameVersion("4.8.2-LIVE.12030094")).toBe("4.8.2");
    expect(shortGameVersion("4.9.0-PTU.999")).toBe("4.9.0");
    expect(shortGameVersion("4.8.2")).toBe("4.8.2");
  });
});

describe("buildUuidToBodyMap", () => {
  it("indexes bodies by wikiUuid and skips bodies without one", () => {
    const map = buildUuidToBodyMap(bodies);
    expect(map.get(WALA_UUID)).toMatchObject({
      systemCode: "STANTON",
      slug: "wala",
    });
    expect(map.size).toBe(1);
  });
});

describe("mapWikiOccurrences", () => {
  it("fans out one row per enabled mining method", () => {
    const result = mapWikiOccurrences({
      locations: [walaEntry()],
      ore: gem,
      uuidMap: buildUuidToBodyMap(bodies),
      patchVersion: "4.8.2",
      syncedAt: "2026-07-16T00:00:00.000Z",
    });

    expect(result.skipped).toBe(0);
    expect(result.occurrences).toHaveLength(2);
    expect(result.occurrences.map((o) => o.method).sort()).toEqual([
      "fps",
      "roc",
    ]);
    expect(result.occurrences[0]).toMatchObject({
      oreCode: "HADA",
      systemCode: "STANTON",
      bodySlug: "wala",
      probabilityPercent: 25,
      relativeProbabilityPercent: 6,
      patchVersion: "4.8.2",
      sourceType: "wiki",
      confidenceScore: 0.9,
      lastVerifiedAt: "2026-07-16T00:00:00.000Z",
    });
  });

  it("skips locations that were filtered out of the body sync", () => {
    const result = mapWikiOccurrences({
      locations: [walaEntry({ uuid: LORVILLE_UUID })],
      ore: gem,
      uuidMap: buildUuidToBodyMap(bodies),
      patchVersion: "4.8.2",
      syncedAt: "2026-07-16T00:00:00.000Z",
    });

    expect(result.occurrences).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it("skips entries without a group probability", () => {
    const result = mapWikiOccurrences({
      locations: [walaEntry({ group_probability_percent: null })],
      ore: gem,
      uuidMap: buildUuidToBodyMap(bodies),
      patchVersion: "4.8.2",
      syncedAt: "2026-07-16T00:00:00.000Z",
    });

    expect(result.occurrences).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it("omits the relative probability when the wiki has none", () => {
    const result = mapWikiOccurrences({
      locations: [walaEntry({ relative_probability_percent: null })],
      ore: gem,
      uuidMap: buildUuidToBodyMap(bodies),
      patchVersion: "4.8.2",
      syncedAt: "2026-07-16T00:00:00.000Z",
    });

    expect(result.occurrences[0]).not.toHaveProperty(
      "relativeProbabilityPercent",
    );
  });
});
