import { describe, expect, it } from "vitest";
import type { Blueprint } from "./blueprints.schema";
import type { CraftStatus } from "./craftability";
import type { CraftableBlueprint } from "./craftable-blueprints.service";
import { filterCollectedBlueprints } from "./collected-blueprints.filter";

function blueprint(overrides: Partial<Blueprint> = {}): Blueprint {
  return {
    key: "BP_CRAFT_AMRS_LaserCannon_S1",
    slug: "bp_craft_amrs_lasercannon_s1",
    wikiUuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
    outputName: "Omnisky III Cannon",
    outputType: "WeaponGun",
    category: "ship-weapon",
    craftTimeSeconds: 540,
    isAvailableByDefault: false,
    ingredients: [{ materialCode: "AGRI", kind: "resource", quantity: 0.36 }],
    gameVersion: "4.8",
    sourceType: "wiki",
    syncedAt: "2026-07-16T00:00:00.000Z",
    ...overrides,
  };
}

function entry(
  bp: Partial<Blueprint>,
  status: CraftStatus,
): CraftableBlueprint {
  return {
    blueprint: blueprint(bp),
    craftability: { status, maxCraftable: 0, components: [] },
  };
}

const entries: CraftableBlueprint[] = [
  entry(
    { key: "A", outputName: "Omnisky III Cannon", category: "ship-weapon" },
    "craftable",
  ),
  entry(
    { key: "B", outputName: "Beacon Helmet", category: "armor" },
    "partial",
  ),
  entry({ key: "C", outputName: "Storm Rifle", category: "weapon" }, "missing"),
];

describe("filterCollectedBlueprints", () => {
  it("returns every entry with empty filters", () => {
    expect(filterCollectedBlueprints(entries, {})).toHaveLength(3);
  });

  it("filters by output name, case-insensitive", () => {
    const result = filterCollectedBlueprints(entries, { q: "helmet" });
    expect(result.map((e) => e.blueprint.key)).toEqual(["B"]);
  });

  it("filters by category", () => {
    const result = filterCollectedBlueprints(entries, { category: "weapon" });
    expect(result.map((e) => e.blueprint.key)).toEqual(["C"]);
  });

  it("filters by craft status", () => {
    const result = filterCollectedBlueprints(entries, { status: "craftable" });
    expect(result.map((e) => e.blueprint.key)).toEqual(["A"]);
  });

  it("combines filters", () => {
    const result = filterCollectedBlueprints(entries, {
      status: "partial",
      category: "armor",
      q: "beacon",
    });
    expect(result.map((e) => e.blueprint.key)).toEqual(["B"]);
  });

  it("ignores blank query strings", () => {
    expect(filterCollectedBlueprints(entries, { q: "   " })).toHaveLength(3);
  });
});
