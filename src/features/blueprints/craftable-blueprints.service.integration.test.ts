import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { upsertBlueprints } from "./blueprints.repository";
import type { Blueprint } from "./blueprints.schema";
import { findCraftableForUser } from "./craftable-blueprints.service";
import { setMaterialQuantity } from "./material-inventory.repository";

const USER = "user-1";
const OTHER = "user-2";

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

const helmet: Blueprint = {
  key: "BP_CRAFT_Char_Armor_Helmet_01",
  slug: "bp_craft_char_armor_helmet_01",
  wikiUuid: "1893e596-acaf-49bc-b367-e43e99c2925f",
  outputName: "Beacon Helmet",
  outputType: "Char_Armor_Helmet",
  category: "armor",
  craftTimeSeconds: 120,
  isAvailableByDefault: true,
  ingredients: [{ materialCode: "HADA", kind: "item", quantity: 4 }],
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

describe("findCraftableForUser", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("craftable-service"));
    await upsertBlueprints(db, [laser, helmet]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns nothing craftable for an empty inventory", async () => {
    const result = await findCraftableForUser(db, USER);

    expect(result.craftable).toEqual([]);
    expect(result.partial).toEqual([]);
  });

  it("partitions craftable and partial blueprints", async () => {
    await setMaterialQuantity(db, USER, "AGRI", 0.36);
    await setMaterialQuantity(db, USER, "HADA", 1);

    const result = await findCraftableForUser(db, USER);

    expect(result.craftable.map((c) => c.blueprint.key)).toEqual([
      "BP_CRAFT_AMRS_LaserCannon_S1",
    ]);
    expect(result.partial.map((c) => c.blueprint.key)).toEqual([
      "BP_CRAFT_Char_Armor_Helmet_01",
    ]);
  });

  /** Deckt SCU-Bruchmengen über den echten DB-Roundtrip ab. */
  it("reports how often a blueprint can be crafted from a fractional SCU stock", async () => {
    await setMaterialQuantity(db, USER, "AGRI", 1.1);

    const [entry] = (await findCraftableForUser(db, USER)).craftable;

    // 1.1 / 0.36 = 3.05… -> 3
    expect(entry.craftability.maxCraftable).toBe(3);
  });

  it("sorts craftable blueprints by maxCraftable descending", async () => {
    await setMaterialQuantity(db, USER, "AGRI", 0.36); // 1x
    await setMaterialQuantity(db, USER, "HADA", 40); // 10x

    const result = await findCraftableForUser(db, USER);

    expect(result.craftable.map((c) => c.blueprint.key)).toEqual([
      "BP_CRAFT_Char_Armor_Helmet_01",
      "BP_CRAFT_AMRS_LaserCannon_S1",
    ]);
  });

  it("isolates inventories per user", async () => {
    await setMaterialQuantity(db, USER, "AGRI", 5);

    const result = await findCraftableForUser(db, OTHER);

    expect(result.craftable).toEqual([]);
  });
});
