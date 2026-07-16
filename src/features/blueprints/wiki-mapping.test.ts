import { describe, expect, it } from "vitest";
import type { Ore } from "@/features/ores/ores.schema";
import type { ScWikiBlueprint } from "@/lib/scwiki-client";
import {
  collectMaterials,
  mapBlueprintCategory,
  mapWikiBlueprint,
  materialCodeForIngredient,
  resolveOreCode,
} from "./wiki-mapping";

const SYNCED_AT = "2026-07-16T00:00:00.000Z";
const VERSION = "4.8.2-LIVE.12030094";

function ore(code: string, name: string): Ore {
  return {
    code,
    name_de: name,
    name_en: name,
    rarityTier: "common",
    mineableBy: { ship: true, roc: false, fps: false },
  };
}

const ores: Ore[] = [
  ore("AGRI", "Agricium"),
  ore("HADA", "Hadanite"),
  ore("SALD", "Saldynium"),
];

function wikiBlueprint(over: Partial<ScWikiBlueprint> = {}): ScWikiBlueprint {
  return {
    uuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
    key: "BP_CRAFT_AMRS_LaserCannon_S1",
    output_item_uuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
    output_name: "Omnisky III Cannon",
    output_class: "amrs_lasercannon_s1",
    craft_time_seconds: 540,
    craft_time_label: "9 minutes",
    is_available_by_default: false,
    game_version: VERSION,
    ingredient_count: 2,
    ingredients: [
      {
        name: "Agricium",
        kind: "resource",
        resource_type_uuid: "dc6fbcbb-5990-4ed5-82ee-93152dab7845",
        item_uuid: null,
        quantity_scu: 0.36,
        quantity: null,
      },
      {
        name: "Hadanite",
        kind: "item",
        resource_type_uuid: null,
        item_uuid: "125dd723-95ad-488d-830f-62c954445ca1",
        quantity_scu: null,
        quantity: 7,
      },
    ],
    output: {
      uuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
      name: "Omnisky III Cannon",
      class: "amrs_lasercannon_s1",
      type: "WeaponGun",
      type_label: "Weapon Gun",
    },
    ...over,
  };
}

describe("resolveOreCode", () => {
  const byName = new Map(ores.map((o) => [o.name_en.toLowerCase(), o.code]));

  it("matches an ingredient name to an ore code", () => {
    expect(resolveOreCode("Agricium", byName)).toBe("AGRI");
  });

  it("matches case-insensitively", () => {
    expect(resolveOreCode("aGrIcIuM", byName)).toBe("AGRI");
  });

  it("strips a trailing '(Ore)' suffix — Saldynium (Ore) -> SALD", () => {
    expect(resolveOreCode("Saldynium (Ore)", byName)).toBe("SALD");
  });

  it("strips a trailing '(Raw)' suffix", () => {
    expect(resolveOreCode("Agricium (Raw)", byName)).toBe("AGRI");
  });

  it("returns undefined for a non-ore ingredient", () => {
    expect(resolveOreCode("Pressurized Ice", byName)).toBeUndefined();
    expect(resolveOreCode("Yormandi Eye", byName)).toBeUndefined();
  });

  it("returns undefined for a null name", () => {
    expect(resolveOreCode(null, byName)).toBeUndefined();
  });
});

describe("materialCodeForIngredient", () => {
  it("uses the ore code for an ore-backed ingredient", () => {
    expect(materialCodeForIngredient("Agricium", "AGRI")).toBe("AGRI");
  });

  it("derives an upper snake-case code for a non-ore ingredient", () => {
    expect(materialCodeForIngredient("Pressurized Ice", undefined)).toBe(
      "PRESSURIZED_ICE",
    );
    expect(materialCodeForIngredient("Yormandi Eye", undefined)).toBe(
      "YORMANDI_EYE",
    );
  });

  it("strips characters that are invalid in a material code", () => {
    expect(materialCodeForIngredient("Xa'Pyen Alloy!", undefined)).toBe(
      "XA_PYEN_ALLOY",
    );
  });

  it("collapses repeated separators and trims them", () => {
    expect(materialCodeForIngredient("  Foo -- Bar  ", undefined)).toBe(
      "FOO_BAR",
    );
  });
});

describe("mapBlueprintCategory", () => {
  it("maps every Char_Armor_* type to armor", () => {
    for (const type of [
      "Char_Armor_Torso",
      "Char_Armor_Helmet",
      "Char_Armor_Arms",
      "Char_Armor_Legs",
      "Char_Armor_Backpack",
      "Char_Armor_Undersuit",
    ]) {
      expect(mapBlueprintCategory(type)).toBe("armor");
    }
  });

  it("maps personal weapons and attachments to weapon", () => {
    expect(mapBlueprintCategory("WeaponPersonal")).toBe("weapon");
    expect(mapBlueprintCategory("WeaponAttachment")).toBe("weapon");
  });

  it("maps ship guns to ship-weapon", () => {
    expect(mapBlueprintCategory("WeaponGun")).toBe("ship-weapon");
  });

  it("maps ship systems to ship-component", () => {
    for (const type of [
      "PowerPlant",
      "Cooler",
      "Shield",
      "Radar",
      "QuantumDrive",
      "DockingCollar",
    ]) {
      expect(mapBlueprintCategory(type)).toBe("ship-component");
    }
  });

  it("maps mining and salvage gear", () => {
    expect(mapBlueprintCategory("WeaponMining")).toBe("mining");
    expect(mapBlueprintCategory("TractorBeam")).toBe("mining");
    expect(mapBlueprintCategory("SalvageHead")).toBe("salvage");
    expect(mapBlueprintCategory("SalvageModifier")).toBe("salvage");
  });

  it("falls back to other for Misc and unknown types", () => {
    expect(mapBlueprintCategory("Misc")).toBe("other");
    expect(mapBlueprintCategory("SomethingNew")).toBe("other");
    expect(mapBlueprintCategory(null)).toBe("other");
  });
});

describe("mapWikiBlueprint", () => {
  const resolve = (name: string | null) =>
    name === "Agricium" ? "AGRI" : name === "Hadanite" ? "HADA" : undefined;

  it("maps a wiki blueprint onto the domain shape", () => {
    const mapped = mapWikiBlueprint(wikiBlueprint(), resolve, SYNCED_AT);

    expect(mapped).toMatchObject({
      key: "BP_CRAFT_AMRS_LaserCannon_S1",
      slug: "bp_craft_amrs_lasercannon_s1",
      wikiUuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
      outputName: "Omnisky III Cannon",
      outputType: "WeaponGun",
      category: "ship-weapon",
      craftTimeSeconds: 540,
      isAvailableByDefault: false,
      gameVersion: VERSION,
      sourceType: "wiki",
      syncedAt: SYNCED_AT,
    });
  });

  it("uses quantity_scu for resource ingredients and quantity for items", () => {
    const mapped = mapWikiBlueprint(wikiBlueprint(), resolve, SYNCED_AT);

    expect(mapped?.ingredients).toEqual([
      { materialCode: "AGRI", kind: "resource", quantity: 0.36 },
      { materialCode: "HADA", kind: "item", quantity: 7 },
    ]);
  });

  it("skips blueprints that fail the schema instead of throwing", () => {
    // Community-API: ein einzelner kaputter Eintrag darf nie den Sync killen
    const mapped = mapWikiBlueprint(
      wikiBlueprint({ key: "BP-CRAFT-INVALID-CHARS" }),
      resolve,
      SYNCED_AT,
    );

    expect(mapped).toBeNull();
  });

  it("falls back to output_class when output_name is null", () => {
    const mapped = mapWikiBlueprint(
      wikiBlueprint({ output_name: null, output: null }),
      resolve,
      SYNCED_AT,
    );

    expect(mapped?.outputName).toBe("amrs_lasercannon_s1");
  });

  it("falls back to the key when name and class are both null", () => {
    const mapped = mapWikiBlueprint(
      wikiBlueprint({ output_name: null, output_class: null, output: null }),
      resolve,
      SYNCED_AT,
    );

    expect(mapped?.outputName).toBe("BP_CRAFT_AMRS_LaserCannon_S1");
  });

  it("skips a blueprint without ingredients", () => {
    expect(
      mapWikiBlueprint(wikiBlueprint({ ingredients: [] }), resolve, SYNCED_AT),
    ).toBeNull();
    expect(
      mapWikiBlueprint(
        wikiBlueprint({ ingredients: null }),
        resolve,
        SYNCED_AT,
      ),
    ).toBeNull();
  });

  it("skips ingredients with a missing or non-positive quantity", () => {
    const mapped = mapWikiBlueprint(
      wikiBlueprint({
        ingredients: [
          {
            name: "Agricium",
            kind: "resource",
            resource_type_uuid: "dc6fbcbb-5990-4ed5-82ee-93152dab7845",
            item_uuid: null,
            quantity_scu: 0.36,
            quantity: null,
          },
          {
            name: "Hadanite",
            kind: "item",
            resource_type_uuid: null,
            item_uuid: "125dd723-95ad-488d-830f-62c954445ca1",
            quantity_scu: null,
            quantity: 0,
          },
        ],
      }),
      resolve,
      SYNCED_AT,
    );

    expect(mapped?.ingredients).toEqual([
      { materialCode: "AGRI", kind: "resource", quantity: 0.36 },
    ]);
  });

  it("treats a blueprint whose ingredients are all invalid as skipped", () => {
    const mapped = mapWikiBlueprint(
      wikiBlueprint({
        ingredients: [
          {
            name: null,
            kind: null,
            resource_type_uuid: null,
            item_uuid: null,
            quantity_scu: null,
            quantity: null,
          },
        ],
      }),
      resolve,
      SYNCED_AT,
    );

    expect(mapped).toBeNull();
  });

  it("defaults a null craft time to 0", () => {
    const mapped = mapWikiBlueprint(
      wikiBlueprint({ craft_time_seconds: null }),
      resolve,
      SYNCED_AT,
    );

    expect(mapped?.craftTimeSeconds).toBe(0);
  });
});

describe("collectMaterials", () => {
  it("derives one material per distinct ingredient", () => {
    const materials = collectMaterials(
      [wikiBlueprint()],
      ores,
      VERSION,
      SYNCED_AT,
    );

    expect(materials.map((m) => m.code).sort()).toEqual(["AGRI", "HADA"]);
  });

  it("links ore-backed ingredients to their ore and carries the wiki uuid", () => {
    const materials = collectMaterials(
      [wikiBlueprint()],
      ores,
      VERSION,
      SYNCED_AT,
    );

    expect(materials.find((m) => m.code === "AGRI")).toEqual({
      code: "AGRI",
      name: "Agricium",
      kind: "resource",
      oreCode: "AGRI",
      wikiUuid: "dc6fbcbb-5990-4ed5-82ee-93152dab7845",
      gameVersion: VERSION,
      sourceType: "wiki",
      syncedAt: SYNCED_AT,
    });
  });

  it("uses item_uuid as the wiki uuid for item ingredients", () => {
    const materials = collectMaterials(
      [wikiBlueprint()],
      ores,
      VERSION,
      SYNCED_AT,
    );

    expect(materials.find((m) => m.code === "HADA")).toMatchObject({
      kind: "item",
      wikiUuid: "125dd723-95ad-488d-830f-62c954445ca1",
      oreCode: "HADA",
    });
  });

  it("keeps non-ore ingredients without an oreCode", () => {
    const materials = collectMaterials(
      [
        wikiBlueprint({
          ingredients: [
            {
              name: "Pressurized Ice",
              kind: "resource",
              resource_type_uuid: "aaaaaaaa-0000-4000-8000-000000000001",
              item_uuid: null,
              quantity_scu: 1,
              quantity: null,
            },
          ],
        }),
      ],
      ores,
      VERSION,
      SYNCED_AT,
    );

    expect(materials).toEqual([
      {
        code: "PRESSURIZED_ICE",
        name: "Pressurized Ice",
        kind: "resource",
        wikiUuid: "aaaaaaaa-0000-4000-8000-000000000001",
        gameVersion: VERSION,
        sourceType: "wiki",
        syncedAt: SYNCED_AT,
      },
    ]);
  });

  it("deduplicates a material used by many blueprints", () => {
    const materials = collectMaterials(
      [wikiBlueprint(), wikiBlueprint({ key: "BP_CRAFT_OTHER" })],
      ores,
      VERSION,
      SYNCED_AT,
    );

    expect(materials.filter((m) => m.code === "AGRI")).toHaveLength(1);
  });

  it("ignores ingredients without a usable uuid", () => {
    const materials = collectMaterials(
      [
        wikiBlueprint({
          ingredients: [
            {
              name: "Ghost",
              kind: "resource",
              resource_type_uuid: null,
              item_uuid: null,
              quantity_scu: 1,
              quantity: null,
            },
          ],
        }),
      ],
      ores,
      VERSION,
      SYNCED_AT,
    );

    expect(materials).toEqual([]);
  });

  it("sorts materials by name", () => {
    const materials = collectMaterials(
      [wikiBlueprint()],
      ores,
      VERSION,
      SYNCED_AT,
    );

    expect(materials.map((m) => m.name)).toEqual(["Agricium", "Hadanite"]);
  });
});
