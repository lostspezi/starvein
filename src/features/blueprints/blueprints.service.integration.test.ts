import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { upsertBlueprints } from "./blueprints.repository";
import type { Blueprint } from "./blueprints.schema";
import { findBlueprintsUsingOre } from "./blueprints.service";
import { upsertMaterials } from "./materials.repository";
import type { Material } from "./materials.schema";

const agricium: Material = {
  code: "AGRI",
  name: "Agricium",
  kind: "resource",
  oreCode: "AGRI",
  wikiUuid: "dc6fbcbb-5990-4ed5-82ee-93152dab7845",
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

const ice: Material = {
  code: "PRESSURIZED_ICE",
  name: "Pressurized Ice",
  kind: "resource",
  wikiUuid: "aaaaaaaa-0000-4000-8000-000000000001",
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

const laser: Blueprint = {
  key: "BP_CRAFT_AMRS_LaserCannon_S1",
  slug: "bp_craft_amrs_lasercannon_s1",
  wikiUuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
  outputName: "Omnisky III Cannon",
  outputType: "WeaponGun",
  category: "ship-weapon",
  craftTimeSeconds: 540,
  isAvailableByDefault: false,
  ingredients: [{ materialCode: "AGRI", kind: "resource", quantity: 0.36 }],
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

const cooler: Blueprint = {
  key: "BP_CRAFT_Cooler_01",
  slug: "bp_craft_cooler_01",
  wikiUuid: "1893e596-acaf-49bc-b367-e43e99c2925f",
  outputName: "Ice Cooler",
  outputType: "Cooler",
  category: "ship-component",
  craftTimeSeconds: 300,
  isAvailableByDefault: false,
  ingredients: [
    { materialCode: "PRESSURIZED_ICE", kind: "resource", quantity: 2 },
  ],
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

describe("findBlueprintsUsingOre", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("blueprints-service"));
    await upsertMaterials(db, [agricium, ice]);
    await upsertBlueprints(db, [laser, cooler]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("finds blueprints that use a material backed by the ore", async () => {
    const found = await findBlueprintsUsingOre(db, "AGRI");

    expect(found.map((f) => f.blueprint.key)).toEqual([
      "BP_CRAFT_AMRS_LaserCannon_S1",
    ]);
  });

  it("reports which material links the ore to the blueprint", async () => {
    const [found] = await findBlueprintsUsingOre(db, "AGRI");

    expect(found.viaMaterials.map((m) => m.code)).toEqual(["AGRI"]);
  });

  it("returns an empty array for an ore no material maps to", async () => {
    await expect(findBlueprintsUsingOre(db, "QUAN")).resolves.toEqual([]);
  });

  it("does not return blueprints whose materials have no ore link", async () => {
    const found = await findBlueprintsUsingOre(db, "AGRI");

    expect(found.map((f) => f.blueprint.key)).not.toContain(
      "BP_CRAFT_Cooler_01",
    );
  });

  it("lists every linking material when an ore backs several", async () => {
    await upsertMaterials(db, [
      { ...agricium, code: "AGRI_RAW", name: "Agricium (Ore)", kind: "item" },
    ]);
    await upsertBlueprints(db, [
      {
        ...laser,
        key: "BP_CRAFT_DUAL",
        slug: "bp_craft_dual",
        outputName: "Dual Agricium Thing",
        ingredients: [
          { materialCode: "AGRI", kind: "resource", quantity: 1 },
          { materialCode: "AGRI_RAW", kind: "item", quantity: 2 },
        ],
      },
    ]);

    const dual = (await findBlueprintsUsingOre(db, "AGRI")).find(
      (f) => f.blueprint.key === "BP_CRAFT_DUAL",
    );

    expect(dual?.viaMaterials.map((m) => m.code).sort()).toEqual([
      "AGRI",
      "AGRI_RAW",
    ]);
  });
});
