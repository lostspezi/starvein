import { describe, expect, it } from "vitest";
import { filterBlueprints } from "./blueprints.filter";
import type { Blueprint } from "./blueprints.schema";

const laser: Blueprint = {
  key: "BP_CRAFT_AMRS_LaserCannon_S1",
  slug: "bp_craft_amrs_lasercannon_s1",
  wikiUuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
  outputName: "Omnisky III Cannon",
  outputType: "WeaponGun",
  category: "ship-weapon",
  craftTimeSeconds: 540,
  isAvailableByDefault: false,
  ingredients: [
    { materialCode: "AGRI", kind: "resource", quantity: 0.36 },
    { materialCode: "HADA", kind: "item", quantity: 7 },
  ],
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

const helmet: Blueprint = {
  key: "BP_CRAFT_Char_Armor_Helmet_01",
  slug: "bp_craft_char_armor_helmet_01",
  wikiUuid: "1893e596-acaf-49bc-b367-e43e99c2925f",
  outputName: "Pembroke Helmet",
  outputType: "Char_Armor_Helmet",
  category: "armor",
  craftTimeSeconds: 120,
  isAvailableByDefault: true,
  ingredients: [{ materialCode: "ASLA", kind: "resource", quantity: 1.5 }],
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

const blueprints = [laser, helmet];

describe("filterBlueprints", () => {
  it("returns everything with no filters", () => {
    expect(filterBlueprints(blueprints, {})).toEqual(blueprints);
  });

  it("filters by category", () => {
    expect(filterBlueprints(blueprints, { category: "armor" })).toEqual([
      helmet,
    ]);
  });

  it("filters by used material (reverse lookup)", () => {
    expect(filterBlueprints(blueprints, { materialCode: "AGRI" })).toEqual([
      laser,
    ]);
  });

  it("matches the material code case-insensitively", () => {
    expect(filterBlueprints(blueprints, { materialCode: "agri" })).toEqual([
      laser,
    ]);
  });

  it("returns nothing for a material no blueprint uses", () => {
    expect(filterBlueprints(blueprints, { materialCode: "QUAN" })).toEqual([]);
  });

  it("matches free text against the output name", () => {
    expect(filterBlueprints(blueprints, { q: "omnisky" })).toEqual([laser]);
  });

  it("matches free text against the wiki key", () => {
    expect(filterBlueprints(blueprints, { q: "char_armor_helmet" })).toEqual([
      helmet,
    ]);
  });

  it("matches free text against the raw output type", () => {
    expect(filterBlueprints(blueprints, { q: "weapongun" })).toEqual([laser]);
  });

  it("restricts to a key whitelist (the user's collection)", () => {
    expect(
      filterBlueprints(blueprints, {
        onlyKeys: new Set(["BP_CRAFT_Char_Armor_Helmet_01"]),
      }),
    ).toEqual([helmet]);
  });

  it("returns nothing for an empty key whitelist", () => {
    expect(filterBlueprints(blueprints, { onlyKeys: new Set() })).toEqual([]);
  });

  it("ignores a null key whitelist", () => {
    expect(filterBlueprints(blueprints, { onlyKeys: null })).toEqual(
      blueprints,
    );
  });

  it("combines category, material and free text", () => {
    expect(
      filterBlueprints(blueprints, {
        category: "ship-weapon",
        materialCode: "HADA",
        q: "omnisky",
      }),
    ).toEqual([laser]);
    expect(
      filterBlueprints(blueprints, { category: "armor", materialCode: "AGRI" }),
    ).toEqual([]);
  });
});
