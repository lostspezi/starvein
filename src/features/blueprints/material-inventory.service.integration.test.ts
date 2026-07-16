import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  getMaterialInventoryMap,
  setMaterialQuantity,
} from "./material-inventory.repository";
import {
  InventoryValidationError,
  setInventory,
} from "./material-inventory.service";
import { upsertMaterials } from "./materials.repository";
import type { Material } from "./materials.schema";

const USER = "user-1";

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

describe("material inventory service", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("material-inventory-service"));
    await upsertMaterials(db, [agricium]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("sets a quantity for a known material", async () => {
    const entry = await setInventory(db, USER, {
      materialCode: "AGRI",
      quantity: 7,
    });

    expect(entry).toMatchObject({ materialCode: "AGRI", quantity: 7 });
    await expect(getMaterialInventoryMap(db, USER)).resolves.toEqual(
      new Map([["AGRI", 7]]),
    );
  });

  it("rejects an unknown material", async () => {
    await expect(
      setInventory(db, USER, { materialCode: "NOPE", quantity: 1 }),
    ).rejects.toBeInstanceOf(InventoryValidationError);
  });

  it("deletes the entry when the quantity is set to zero", async () => {
    await setMaterialQuantity(db, USER, "AGRI", 5);

    const result = await setInventory(db, USER, {
      materialCode: "AGRI",
      quantity: 0,
    });

    expect(result).toBeNull();
    await expect(getMaterialInventoryMap(db, USER)).resolves.toEqual(new Map());
  });

  it("setting zero on a material with no entry is a no-op", async () => {
    await expect(
      setInventory(db, USER, { materialCode: "AGRI", quantity: 0 }),
    ).resolves.toBeNull();
    await expect(getMaterialInventoryMap(db, USER)).resolves.toEqual(new Map());
  });
});
