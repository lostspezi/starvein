import { describe, expect, it } from "vitest";
import type { ScWikiCommodity } from "@/lib/scwiki-client";
import type { OreCodeMapping } from "./curated-ore-codes";
import { mapWikiCommodityToOre } from "./wiki-mapping";

function commodity(overrides: Partial<ScWikiCommodity> = {}): ScWikiCommodity {
  return {
    uuid: "30000000-0000-4000-8000-0000000000ff",
    key: "Ore_Agricium",
    name: "Agricium (Ore)",
    slug: "agricium-ore",
    tier: "uncommon",
    density_g_per_cc: 8.4,
    instability: 350,
    resistance: 0.5,
    is_mineable: true,
    has_ship_mineables: true,
    has_ground_vehicle_mineables: false,
    has_fps_mineables: false,
    signature: 4000,
    kind: "mineable",
    methods: ["Ship"],
    ...overrides,
  };
}

const AGRI_MAPPING: OreCodeMapping = {
  wikiKey: "Ore_Agricium",
  code: "AGRI",
  name_de: "Agricium",
  name_en: "Agricium",
  rarityTierFallback: "uncommon",
};

describe("mapWikiCommodityToOre", () => {
  it("maps a ship ore with wiki tier and mineable booleans", () => {
    const ore = mapWikiCommodityToOre(commodity(), AGRI_MAPPING);

    expect(ore).toEqual({
      code: "AGRI",
      name_de: "Agricium",
      name_en: "Agricium",
      rarityTier: "uncommon",
      mineableBy: { ship: true, roc: false, fps: false },
      density: 8.4,
      instability: 350,
      resistance: 0.5,
    });
  });

  it("falls back to the curated rarity when the wiki tier is null", () => {
    const ore = mapWikiCommodityToOre(commodity({ tier: null }), {
      ...AGRI_MAPPING,
      rarityTierFallback: "epic",
    });
    expect(ore?.rarityTier).toBe("epic");
  });

  it("falls back to the curated rarity when the wiki tier is unknown", () => {
    const ore = mapWikiCommodityToOre(
      commodity({ tier: "mythic" }),
      AGRI_MAPPING,
    );
    expect(ore?.rarityTier).toBe("uncommon");
  });

  it("maps ground-vehicle mineables to roc", () => {
    const ore = mapWikiCommodityToOre(
      commodity({
        has_ship_mineables: false,
        has_ground_vehicle_mineables: true,
        has_fps_mineables: true,
      }),
      AGRI_MAPPING,
    );
    expect(ore?.mineableBy).toEqual({ ship: false, roc: true, fps: true });
  });

  it("uses the mineable fallback when the wiki has no method booleans", () => {
    const ore = mapWikiCommodityToOre(
      commodity({
        has_ship_mineables: false,
        has_ground_vehicle_mineables: false,
        has_fps_mineables: false,
      }),
      {
        ...AGRI_MAPPING,
        mineableByFallback: { ship: false, roc: true, fps: true },
      },
    );
    expect(ore?.mineableBy).toEqual({ ship: false, roc: true, fps: true });
  });

  it("returns null when there is no method info at all", () => {
    const ore = mapWikiCommodityToOre(
      commodity({
        has_ship_mineables: false,
        has_ground_vehicle_mineables: false,
        has_fps_mineables: false,
      }),
      AGRI_MAPPING,
    );
    expect(ore).toBeNull();
  });

  it("omits absent physical properties instead of writing null", () => {
    const ore = mapWikiCommodityToOre(
      commodity({
        density_g_per_cc: null,
        instability: null,
        resistance: null,
      }),
      AGRI_MAPPING,
    );
    expect(ore).not.toHaveProperty("density");
    expect(ore).not.toHaveProperty("instability");
    expect(ore).not.toHaveProperty("resistance");
  });
});
