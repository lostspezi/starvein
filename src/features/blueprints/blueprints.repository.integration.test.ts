import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  countBlueprints,
  ensureBlueprintIndexes,
  findAllBlueprintRefs,
  findAllBlueprints,
  findBlueprintByKey,
  findBlueprintBySlug,
  findBlueprintsByMaterialCode,
  findBlueprintsByMaterialCodes,
  pruneBlueprintsNotIn,
  upsertBlueprints,
} from "./blueprints.repository";
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
  outputName: "Beacon Helmet",
  outputType: "Char_Armor_Helmet",
  category: "armor",
  craftTimeSeconds: 120,
  isAvailableByDefault: true,
  ingredients: [{ materialCode: "ASLA", kind: "resource", quantity: 1.5 }],
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

describe("blueprints repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("blueprints-repo"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns an empty array for an empty collection", async () => {
    await expect(findAllBlueprints(db)).resolves.toEqual([]);
  });

  it("returns inserted blueprints sorted by output name", async () => {
    await upsertBlueprints(db, [laser, helmet]);

    const blueprints = await findAllBlueprints(db);

    expect(blueprints.map((b) => b.outputName)).toEqual([
      "Beacon Helmet",
      "Omnisky III Cannon",
    ]);
  });

  it("upserts idempotently by key", async () => {
    await upsertBlueprints(db, [laser]);
    await upsertBlueprints(db, [{ ...laser, category: "weapon" }]);

    const blueprints = await findAllBlueprints(db);

    expect(blueprints).toHaveLength(1);
    expect(blueprints[0].category).toBe("weapon");
  });

  it("finds a blueprint by key and by slug", async () => {
    await upsertBlueprints(db, [laser, helmet]);

    await expect(
      findBlueprintByKey(db, "BP_CRAFT_AMRS_LaserCannon_S1"),
    ).resolves.toEqual(laser);
    await expect(
      findBlueprintBySlug(db, "bp_craft_amrs_lasercannon_s1"),
    ).resolves.toEqual(laser);
    await expect(findBlueprintBySlug(db, "nope")).resolves.toBeNull();
  });

  it("finds blueprints that use a given material (reverse lookup)", async () => {
    await upsertBlueprints(db, [laser, helmet]);

    const usingAgri = await findBlueprintsByMaterialCode(db, "AGRI");
    expect(usingAgri.map((b) => b.key)).toEqual([
      "BP_CRAFT_AMRS_LaserCannon_S1",
    ]);

    await expect(findBlueprintsByMaterialCode(db, "QUAN")).resolves.toEqual([]);
  });

  it("finds blueprints using any of several materials", async () => {
    await upsertBlueprints(db, [laser, helmet]);

    const found = await findBlueprintsByMaterialCodes(db, ["AGRI", "ASLA"]);

    expect(found.map((b) => b.outputName)).toEqual([
      "Beacon Helmet",
      "Omnisky III Cannon",
    ]);
  });

  it("returns an empty array when asked for no material codes", async () => {
    await upsertBlueprints(db, [laser]);
    await expect(findBlueprintsByMaterialCodes(db, [])).resolves.toEqual([]);
  });

  it("lists lean blueprint refs for the sitemap", async () => {
    await upsertBlueprints(db, [laser, helmet]);

    const refs = await findAllBlueprintRefs(db);

    expect(refs).toEqual(
      expect.arrayContaining([
        { slug: laser.slug, syncedAt: laser.syncedAt },
        { slug: helmet.slug, syncedAt: helmet.syncedAt },
      ]),
    );
    expect(refs).toHaveLength(2);
  });

  it("prunes blueprints the current sync no longer provides", async () => {
    await upsertBlueprints(db, [laser, helmet]);

    const pruned = await pruneBlueprintsNotIn(db, [
      "BP_CRAFT_AMRS_LaserCannon_S1",
    ]);

    expect(pruned).toBe(1);
    expect((await findAllBlueprints(db)).map((b) => b.key)).toEqual([
      "BP_CRAFT_AMRS_LaserCannon_S1",
    ]);
  });

  it("counts the blueprints in the catalog", async () => {
    await expect(countBlueprints(db)).resolves.toBe(0);

    await upsertBlueprints(db, [laser, helmet]);

    await expect(countBlueprints(db)).resolves.toBe(2);
  });

  it("strips mongo _id from results", async () => {
    await upsertBlueprints(db, [laser]);

    const [blueprint] = await findAllBlueprints(db);

    expect(blueprint).not.toHaveProperty("_id");
  });

  it("creates unique key/slug indexes and a multikey ingredient index", async () => {
    await ensureBlueprintIndexes(db);
    await ensureBlueprintIndexes(db);

    const indexes = await db.collection("blueprints").indexes();
    expect(indexes.find((i) => i.key.key === 1)?.unique).toBe(true);
    expect(indexes.find((i) => i.key.slug === 1)?.unique).toBe(true);
    expect(indexes.some((i) => i.key["ingredients.materialCode"] === 1)).toBe(
      true,
    );
  });
});
