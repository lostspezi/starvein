import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { insertWarehouseEntry } from "@/features/warehouse/warehouse.repository";
import type { WarehouseEntry } from "@/features/warehouse/warehouse.schema";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { addCollectedBlueprint } from "./blueprint-collection.repository";
import { upsertBlueprints } from "./blueprints.repository";
import type { Blueprint } from "./blueprints.schema";
import { findCollectedCraftableFromWarehouse } from "./collected-craftable.service";
import { upsertMaterials } from "./materials.repository";
import type { Material } from "./materials.schema";

const USER = "user-1";
const OTHER = "user-2";

const laser: Blueprint = {
  key: "BP_LASER",
  slug: "bp_laser",
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
};

const helmet: Blueprint = {
  key: "BP_HELMET",
  slug: "bp_helmet",
  wikiUuid: "1893e596-acaf-49bc-b367-e43e99c2925f",
  outputName: "Beacon Helmet",
  outputType: "Char_Armor_Helmet",
  category: "armor",
  craftTimeSeconds: 120,
  isAvailableByDefault: true,
  ingredients: [{ materialCode: "HADA", kind: "item", quantity: 4 }],
  gameVersion: "4.8",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

const materials: Material[] = [
  {
    code: "AGRI",
    name: "Agricium",
    kind: "resource",
    oreCode: "AGRI",
    wikiUuid: "dc6fbcbb-5990-4ed5-82ee-93152dab7845",
    gameVersion: "4.8",
    sourceType: "wiki",
    syncedAt: "2026-07-16T00:00:00.000Z",
  },
  {
    code: "HADA",
    name: "Hadanite",
    kind: "item",
    oreCode: "HADA",
    wikiUuid: "125dd723-95ad-488d-830f-62c954445ca1",
    gameVersion: "4.8",
    sourceType: "wiki",
    syncedAt: "2026-07-16T00:00:00.000Z",
  },
];

function stock(overrides: Partial<WarehouseEntry>): WarehouseEntry {
  return {
    id: "stock-1",
    ownerUserId: USER,
    oreCode: "AGRI",
    kind: "raw",
    quantityScu: 1,
    location: { kind: "custom", label: "im Schiff" },
    createdAt: "2026-07-16T00:00:00.000Z",
    updatedAt: "2026-07-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("findCollectedCraftableFromWarehouse", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("collected-craftable"));
    await upsertBlueprints(db, [laser, helmet]);
    await upsertMaterials(db, materials);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns only collected blueprints", async () => {
    await addCollectedBlueprint(db, USER, laser.key);
    await insertWarehouseEntry(db, stock({ oreCode: "AGRI", quantityScu: 1 }));

    const result = await findCollectedCraftableFromWarehouse(db, USER);

    expect(result.map((e) => e.blueprint.key)).toEqual(["BP_LASER"]);
  });

  it("marks a collected blueprint craftable when the warehouse covers it", async () => {
    await addCollectedBlueprint(db, USER, laser.key);
    await insertWarehouseEntry(db, stock({ oreCode: "AGRI", quantityScu: 1 }));

    const [entry] = await findCollectedCraftableFromWarehouse(db, USER);

    expect(entry.craftability.status).toBe("craftable");
    // 1.0 / 0.36 = 2.7… -> 2
    expect(entry.craftability.maxCraftable).toBe(2);
  });

  it("sums raw and refined stock of the same ore", async () => {
    await addCollectedBlueprint(db, USER, laser.key);
    await insertWarehouseEntry(
      db,
      stock({ id: "raw", oreCode: "AGRI", kind: "raw", quantityScu: 0.2 }),
    );
    await insertWarehouseEntry(
      db,
      stock({ id: "ref", oreCode: "AGRI", kind: "refined", quantityScu: 0.2 }),
    );

    const [entry] = await findCollectedCraftableFromWarehouse(db, USER);

    // 0.2 + 0.2 = 0.4 >= 0.36
    expect(entry.craftability.status).toBe("craftable");
  });

  it("reports a collected blueprint as missing when its material is not stocked", async () => {
    await addCollectedBlueprint(db, USER, helmet.key);

    const [entry] = await findCollectedCraftableFromWarehouse(db, USER);

    expect(entry.blueprint.key).toBe("BP_HELMET");
    expect(entry.craftability.status).toBe("missing");
  });

  it("sorts craftable blueprints before missing ones", async () => {
    await addCollectedBlueprint(db, USER, laser.key);
    await addCollectedBlueprint(db, USER, helmet.key);
    await insertWarehouseEntry(db, stock({ oreCode: "AGRI", quantityScu: 1 }));

    const result = await findCollectedCraftableFromWarehouse(db, USER);

    expect(result.map((e) => e.blueprint.key)).toEqual([
      "BP_LASER",
      "BP_HELMET",
    ]);
    expect(result[0].craftability.status).toBe("craftable");
    expect(result[1].craftability.status).toBe("missing");
  });

  it("isolates collections and warehouses per user", async () => {
    await addCollectedBlueprint(db, USER, laser.key);
    await insertWarehouseEntry(db, stock({ oreCode: "AGRI", quantityScu: 5 }));

    const result = await findCollectedCraftableFromWarehouse(db, OTHER);

    expect(result).toEqual([]);
  });
});
