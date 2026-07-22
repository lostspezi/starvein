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

const shipOre: Ore = {
  code: "BORA",
  name_de: "Borase",
  name_en: "Borase",
  rarityTier: "rare",
  mineableBy: { ship: true, roc: false, fps: false },
};

const ORE_CODE_BY_WIKI_KEY = new Map([
  ["Ore_Borase", "BORA"],
  ["Raw_Bexalite", "BEXA"],
  ["Ore_Gold", "GOLD"],
  ["Hadanite", "HADA"],
]);

function material(
  key: string,
  name: string,
  isCurrent: boolean,
  min: number | null,
  max: number | null,
) {
  return {
    key,
    name,
    is_current: isCurrent,
    min_percentage: min,
    max_percentage: max,
  };
}

/** Eigener Borase-Rock: Borase dominant (24.3–74.3 %), Bexalite Beiprodukt. */
function borasePrimaryRock() {
  return {
    key: "MineableRock_AsteroidRare_Borase",
    label: "Borase",
    group_name: "SpaceShip_Mineables",
    materials: [
      material("Ore_Borase", "Borase (Ore)", true, 24.3, 74.3),
      material("Raw_Bexalite", "Bexalite (Raw)", false, 2, 5),
    ],
  };
}

/** Bexalite-Rock: Borase nur Beiprodukt (2–5 %). */
function bexaliteRockWithBoraseByproduct() {
  return {
    key: "MineableRock_AsteroidRare_Bexalite",
    label: "Bexalite",
    group_name: "SpaceShip_Mineables",
    materials: [
      material("Raw_Bexalite", "Bexalite (Raw)", false, 28.3, 78.3),
      material("Ore_Borase", "Borase (Ore)", true, 2, 5),
    ],
  };
}

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

describe("mapWikiOccurrences deposit derivation", () => {
  function mapShip(resources: unknown, ore: Ore = shipOre) {
    return mapWikiOccurrences({
      locations: [
        walaEntry({ resources }) as Parameters<
          typeof mapWikiOccurrences
        >[0]["locations"][number],
      ],
      ore,
      uuidMap: buildUuidToBodyMap(bodies),
      patchVersion: "4.8.2",
      syncedAt: "2026-07-16T00:00:00.000Z",
      oreCodeByWikiKey: ORE_CODE_BY_WIKI_KEY,
    });
  }

  it("marks the ore as primary when it dominates its own rock", () => {
    const result = mapShip([borasePrimaryRock()]);

    expect(result.occurrences).toHaveLength(1);
    expect(result.occurrences[0]).toMatchObject({
      method: "ship",
      depositType: "primary",
      compositionPercent: { min: 24.3, max: 74.3 },
      rockBreakdown: [
        {
          rockLabel: "Borase",
          isPrimary: true,
          oreCompositionPercent: { min: 24.3, max: 74.3 },
          dominantMaterialName: "Borase (Ore)",
          dominantMaterialOreCode: "BORA",
        },
      ],
    });
    expect(result.occurrences[0]).not.toHaveProperty("byproductOf");
  });

  it("marks the ore as secondary with byproductOf when it never dominates", () => {
    const result = mapShip([bexaliteRockWithBoraseByproduct()]);

    expect(result.occurrences[0]).toMatchObject({
      depositType: "secondary",
      compositionPercent: { min: 2, max: 5 },
      byproductOf: ["BEXA"],
      rockBreakdown: [
        {
          rockLabel: "Bexalite",
          isPrimary: false,
          oreCompositionPercent: { min: 2, max: 5 },
          dominantMaterialName: "Bexalite (Raw)",
          dominantMaterialOreCode: "BEXA",
        },
      ],
    });
  });

  it("logs unmapped dominant materials instead of guessing codes", () => {
    const rock = {
      key: "MineableRock_AsteroidRare_Unobtainium",
      label: "Unobtainium",
      group_name: "SpaceShip_Mineables",
      materials: [
        material("Raw_Unobtainium", "Unobtainium (Raw)", false, 30, 80),
        material("Ore_Borase", "Borase (Ore)", true, 2, 5),
      ],
    };
    const result = mapShip([rock]);

    expect(result.occurrences[0]).toMatchObject({ depositType: "secondary" });
    expect(result.occurrences[0]).not.toHaveProperty("byproductOf");
    expect(result.occurrences[0].rockBreakdown?.[0]).toMatchObject({
      dominantMaterialName: "Unobtainium (Raw)",
    });
    expect(result.occurrences[0].rockBreakdown?.[0]).not.toHaveProperty(
      "dominantMaterialOreCode",
    );
    expect(result.unmappedByproductKeys).toEqual(["Raw_Unobtainium"]);
  });

  it("dedupes quality bands per material before deciding dominance", () => {
    const rock = {
      key: "MineableRock_AsteroidRare_Borase",
      label: "Borase",
      group_name: "SpaceShip_Mineables",
      materials: [
        material("Ore_Borase", "Borase (Ore)", true, 24.3, 74.3),
        material("Ore_Borase", "Borase (Ore)", true, 9.7, 15.7),
        material("Raw_Bexalite", "Bexalite (Raw)", false, 2, 5),
      ],
    };
    const result = mapShip([rock]);

    expect(result.occurrences[0]).toMatchObject({
      depositType: "primary",
      compositionPercent: { min: 9.7, max: 74.3 },
    });
  });

  it("treats a tie on max percentage as dominance for the ore", () => {
    const rock = {
      key: "MineableRock_AsteroidRare_Mixed",
      label: "Mixed",
      group_name: "SpaceShip_Mineables",
      materials: [
        material("Ore_Borase", "Borase (Ore)", true, 20, 50),
        material("Ore_Gold", "Gold (Ore)", false, 10, 50),
      ],
    };
    const result = mapShip([rock]);

    expect(result.occurrences[0]).toMatchObject({ depositType: "primary" });
  });

  it("skips unknown resource groups and reports them", () => {
    const rock = {
      key: "MineableRock_Future_Thing",
      label: "Future",
      group_name: "Hover_Mineables",
      materials: [material("Ore_Borase", "Borase (Ore)", true, 20, 50)],
    };
    const result = mapShip([rock]);

    expect(result.occurrences[0]).not.toHaveProperty("depositType");
    expect(result.occurrences[0]).not.toHaveProperty("rockBreakdown");
    expect(result.unknownResourceGroups).toEqual(["Hover_Mineables"]);
  });

  it("leaves rows untouched when the wiki sends no resources", () => {
    const result = mapShip(undefined);

    expect(result.occurrences[0]).not.toHaveProperty("depositType");
    expect(result.occurrences[0]).not.toHaveProperty("compositionPercent");
    expect(result.occurrences[0]).not.toHaveProperty("rockBreakdown");
    expect(result.unknownResourceGroups).toEqual([]);
    expect(result.unmappedByproductKeys).toEqual([]);
  });

  it("marks single-material FPS deposits as primary", () => {
    const rock = {
      key: "MineableRock_FPS_Hadanite",
      label: "Hadanite",
      group_name: "FPS_Mineables",
      materials: [material("Hadanite", "Hadanite", true, 50, 100)],
    };
    const result = mapShip([rock], gem);

    const fpsRow = result.occurrences.find((o) => o.method === "fps");
    const rocRow = result.occurrences.find((o) => o.method === "roc");
    expect(fpsRow).toMatchObject({
      depositType: "primary",
      compositionPercent: { min: 50, max: 100 },
    });
    // Keine GroundVehicle-Resource an der Location -> ROC-Zeile bleibt neutral
    expect(rocRow).not.toHaveProperty("depositType");
  });

  it("derives deposit type per method independently", () => {
    const ore: Ore = {
      ...shipOre,
      mineableBy: { ship: true, roc: false, fps: true },
    };
    const fpsRock = {
      key: "MineableRock_FPS_Borase",
      label: "Borase",
      group_name: "FPS_Mineables",
      materials: [material("Ore_Borase", "Borase (Ore)", true, 50, 100)],
    };
    const result = mapShip([bexaliteRockWithBoraseByproduct(), fpsRock], ore);

    const shipRow = result.occurrences.find((o) => o.method === "ship");
    const fpsRow = result.occurrences.find((o) => o.method === "fps");
    expect(shipRow).toMatchObject({ depositType: "secondary" });
    expect(fpsRow).toMatchObject({ depositType: "primary" });
  });

  it("aggregates compositionPercent only over rocks matching the classification", () => {
    const result = mapShip([
      borasePrimaryRock(),
      bexaliteRockWithBoraseByproduct(),
    ]);

    expect(result.occurrences[0]).toMatchObject({
      depositType: "primary",
      // nur der dominante Rock zählt für die Range, nicht das 2-5%-Beiprodukt
      compositionPercent: { min: 24.3, max: 74.3 },
    });
    expect(result.occurrences[0].rockBreakdown).toHaveLength(2);
    expect(result.occurrences[0]).not.toHaveProperty("byproductOf");
  });
});
