import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  deleteMaterialQuantity,
  ensureMaterialInventoryIndexes,
  getMaterialInventoryMap,
  listMaterialInventory,
  setMaterialQuantity,
} from "./material-inventory.repository";

const USER = "user-1";
const OTHER = "user-2";

describe("material inventory repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("material-inventory-repo"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns an empty inventory for a new user", async () => {
    await expect(listMaterialInventory(db, USER)).resolves.toEqual([]);
    await expect(getMaterialInventoryMap(db, USER)).resolves.toEqual(new Map());
  });

  it("sets a quantity for a material", async () => {
    await setMaterialQuantity(db, USER, "AGRI", 5);

    const entries = await listMaterialInventory(db, USER);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      userId: USER,
      materialCode: "AGRI",
      quantity: 5,
    });
  });

  it("overwrites the quantity on repeated set (idempotent PUT)", async () => {
    await setMaterialQuantity(db, USER, "AGRI", 5);
    await setMaterialQuantity(db, USER, "AGRI", 12);

    const entries = await listMaterialInventory(db, USER);

    expect(entries).toHaveLength(1);
    expect(entries[0].quantity).toBe(12);
  });

  /** "resource"-Materialien werden in SCU geführt — Bruchmengen sind normal. */
  it("stores a fractional SCU quantity unrounded", async () => {
    await setMaterialQuantity(db, USER, "AGRI", 0.36);

    const map = await getMaterialInventoryMap(db, USER);

    expect(map.get("AGRI")).toBe(0.36);
  });

  it("exposes the inventory as a code→quantity map", async () => {
    await setMaterialQuantity(db, USER, "AGRI", 5);
    await setMaterialQuantity(db, USER, "HADA", 2);

    const map = await getMaterialInventoryMap(db, USER);

    expect(map.get("AGRI")).toBe(5);
    expect(map.get("HADA")).toBe(2);
    expect(map.get("NOPE")).toBeUndefined();
  });

  it("deletes an entry", async () => {
    await setMaterialQuantity(db, USER, "AGRI", 5);
    await deleteMaterialQuantity(db, USER, "AGRI");

    await expect(listMaterialInventory(db, USER)).resolves.toEqual([]);
  });

  it("isolates inventories per user", async () => {
    await setMaterialQuantity(db, USER, "AGRI", 5);

    await expect(listMaterialInventory(db, OTHER)).resolves.toEqual([]);
    await expect(getMaterialInventoryMap(db, OTHER)).resolves.toEqual(
      new Map(),
    );
  });

  it("does not delete another user's entry", async () => {
    await setMaterialQuantity(db, USER, "AGRI", 5);
    await deleteMaterialQuantity(db, OTHER, "AGRI");

    const map = await getMaterialInventoryMap(db, USER);
    expect(map.get("AGRI")).toBe(5);
  });

  it("strips mongo _id from results", async () => {
    await setMaterialQuantity(db, USER, "AGRI", 5);

    const [entry] = await listMaterialInventory(db, USER);

    expect(entry).not.toHaveProperty("_id");
  });

  it("creates a unique compound index (idempotent)", async () => {
    await ensureMaterialInventoryIndexes(db);
    await ensureMaterialInventoryIndexes(db);

    const indexes = await db.collection("materialInventory").indexes();
    const compound = indexes.find(
      (i) => i.key.userId === 1 && i.key.materialCode === 1,
    );
    expect(compound?.unique).toBe(true);
  });
});
