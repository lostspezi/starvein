import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  createWarehouseEntry,
  deleteWarehouseEntry,
  updateWarehouseEntry,
  WarehouseNotFoundError,
  WarehouseValidationError,
} from "./warehouse.service";
import { listWarehouseEntriesByOwner } from "./warehouse.repository";
import type { WarehouseEntryInput } from "./warehouse.schema";

const USER = "user-1";
const OTHER = "user-2";
const SYNCED_AT = "2026-07-14T08:00:00.000Z";

function makeInput(
  overrides: Partial<WarehouseEntryInput> = {},
): WarehouseEntryInput {
  return {
    oreCode: "QUAN",
    kind: "raw",
    quantityScu: 32,
    location: {
      kind: "celestialBody",
      systemCode: "STANTON",
      bodySlug: "daymar",
    },
    ...overrides,
  };
}

async function seedMasterData(db: Db) {
  await db.collection("ores").insertOne({
    code: "QUAN",
    name_de: "Quantanium",
    name_en: "Quantainium",
    rarityTier: "legendary",
    mineableBy: { ship: true, roc: false, fps: false },
  });
  await db.collection("celestialBodies").insertOne({
    slug: "daymar",
    systemCode: "STANTON",
    type: "moon",
    name: "Daymar",
    parentSlug: "crusader",
    uexId: 3,
  });
  await db.collection("refineryYields").insertOne({
    oreCode: "QUAN",
    terminalId: 32,
    terminalName: "ARC-L1 Wide Forest Station",
    starSystemName: "Stanton",
    bonusPercent: 5,
    syncedAt: SYNCED_AT,
  });
}

describe("warehouse service", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("warehouse-service"));
    await seedMasterData(db);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("creates an entry and denormalizes the body name", async () => {
    const entry = await createWarehouseEntry(db, USER, makeInput());

    expect(entry.ownerUserId).toBe(USER);
    expect(entry.location).toEqual({
      kind: "celestialBody",
      systemCode: "STANTON",
      bodySlug: "daymar",
      bodyName: "Daymar",
    });
    expect(entry.id).toBeTruthy();
    expect(entry.createdAt).toBe(entry.updatedAt);
  });

  it("creates an entry and denormalizes the terminal name", async () => {
    const entry = await createWarehouseEntry(
      db,
      USER,
      makeInput({ location: { kind: "terminal", terminalId: 32 } }),
    );

    expect(entry.location).toEqual({
      kind: "terminal",
      terminalId: 32,
      terminalName: "ARC-L1 Wide Forest Station",
    });
  });

  it("keeps custom locations as entered", async () => {
    const entry = await createWarehouseEntry(
      db,
      USER,
      makeInput({ location: { kind: "custom", label: "im Schiff" } }),
    );

    expect(entry.location).toEqual({ kind: "custom", label: "im Schiff" });
  });

  it("rejects unknown ore, body and terminal references", async () => {
    await expect(
      createWarehouseEntry(db, USER, makeInput({ oreCode: "XXXX" })),
    ).rejects.toBeInstanceOf(WarehouseValidationError);
    await expect(
      createWarehouseEntry(
        db,
        USER,
        makeInput({
          location: {
            kind: "celestialBody",
            systemCode: "STANTON",
            bodySlug: "nowhere",
          },
        }),
      ),
    ).rejects.toBeInstanceOf(WarehouseValidationError);
    await expect(
      createWarehouseEntry(
        db,
        USER,
        makeInput({ location: { kind: "terminal", terminalId: 999 } }),
      ),
    ).rejects.toBeInstanceOf(WarehouseValidationError);
  });

  it("updates quantity and note, bumping updatedAt", async () => {
    const entry = await createWarehouseEntry(db, USER, makeInput());

    const updated = await updateWarehouseEntry(db, USER, entry.id, {
      quantityScu: 5,
      note: "Rest nach Verkauf",
    });

    expect(updated.quantityScu).toBe(5);
    expect(updated.note).toBe("Rest nach Verkauf");
    expect(updated.location).toEqual(entry.location);
    expect(updated.updatedAt >= entry.updatedAt).toBe(true);
  });

  it("persists and updates a qualityRating", async () => {
    const entry = await createWarehouseEntry(
      db,
      USER,
      makeInput({ qualityRating: 640 }),
    );
    expect(entry.qualityRating).toBe(640);

    const updated = await updateWarehouseEntry(db, USER, entry.id, {
      qualityRating: 900,
    });
    expect(updated.qualityRating).toBe(900);
  });

  it("leaves an existing qualityRating untouched on unrelated updates", async () => {
    const entry = await createWarehouseEntry(
      db,
      USER,
      makeInput({ qualityRating: 500 }),
    );

    const updated = await updateWarehouseEntry(db, USER, entry.id, {
      quantityScu: 5,
    });
    expect(updated.qualityRating).toBe(500);
  });

  it("re-resolves the location on update", async () => {
    const entry = await createWarehouseEntry(db, USER, makeInput());

    const updated = await updateWarehouseEntry(db, USER, entry.id, {
      location: { kind: "terminal", terminalId: 32 },
    });

    expect(updated.location).toEqual({
      kind: "terminal",
      terminalId: 32,
      terminalName: "ARC-L1 Wide Forest Station",
    });
  });

  it("throws NotFound for foreign or missing entries", async () => {
    const entry = await createWarehouseEntry(db, USER, makeInput());

    await expect(
      updateWarehouseEntry(db, OTHER, entry.id, { quantityScu: 1 }),
    ).rejects.toBeInstanceOf(WarehouseNotFoundError);
    await expect(
      deleteWarehouseEntry(db, OTHER, entry.id),
    ).rejects.toBeInstanceOf(WarehouseNotFoundError);
    await expect(
      updateWarehouseEntry(db, USER, "missing", { quantityScu: 1 }),
    ).rejects.toBeInstanceOf(WarehouseNotFoundError);
  });

  it("deletes an own entry", async () => {
    const entry = await createWarehouseEntry(db, USER, makeInput());

    await deleteWarehouseEntry(db, USER, entry.id);

    await expect(listWarehouseEntriesByOwner(db, USER)).resolves.toEqual([]);
  });
});
