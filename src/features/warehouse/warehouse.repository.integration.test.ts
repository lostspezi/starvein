import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  deleteWarehouseEntryById,
  findWarehouseEntryById,
  insertWarehouseEntries,
  insertWarehouseEntry,
  listWarehouseEntriesByOwner,
  replaceWarehouseEntry,
} from "./warehouse.repository";
import type { WarehouseEntry } from "./warehouse.schema";

const USER = "user-1";
const OTHER = "user-2";

function makeEntry(overrides: Partial<WarehouseEntry> = {}): WarehouseEntry {
  return {
    id: "entry-1",
    ownerUserId: USER,
    oreCode: "QUAN",
    kind: "raw",
    quantityScu: 32,
    location: {
      kind: "celestialBody",
      systemCode: "STANTON",
      bodySlug: "daymar",
      bodyName: "Daymar",
    },
    createdAt: "2026-07-14T10:00:00.000Z",
    updatedAt: "2026-07-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("warehouse repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("warehouse"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("inserts and finds an entry by id", async () => {
    await insertWarehouseEntry(db, makeEntry());

    await expect(findWarehouseEntryById(db, "entry-1")).resolves.toEqual(
      makeEntry(),
    );
    await expect(findWarehouseEntryById(db, "missing")).resolves.toBeNull();
  });

  it("bulk-inserts entries and skips the write for an empty array", async () => {
    await insertWarehouseEntries(db, [
      makeEntry({ id: "a" }),
      makeEntry({ id: "b" }),
    ]);
    await insertWarehouseEntries(db, []);

    await expect(listWarehouseEntriesByOwner(db, USER)).resolves.toHaveLength(
      2,
    );
  });

  it("lists only the owner's entries, newest update first", async () => {
    await insertWarehouseEntry(
      db,
      makeEntry({ id: "old", updatedAt: "2026-07-13T10:00:00.000Z" }),
    );
    await insertWarehouseEntry(
      db,
      makeEntry({ id: "new", updatedAt: "2026-07-14T10:00:00.000Z" }),
    );
    await insertWarehouseEntry(
      db,
      makeEntry({ id: "foreign", ownerUserId: OTHER }),
    );

    const entries = await listWarehouseEntriesByOwner(db, USER);

    expect(entries.map((e) => e.id)).toEqual(["new", "old"]);
  });

  it("replaces an entry", async () => {
    await insertWarehouseEntry(db, makeEntry());

    await replaceWarehouseEntry(
      db,
      makeEntry({ quantityScu: 5, note: "Rest" }),
    );

    const found = await findWarehouseEntryById(db, "entry-1");
    expect(found?.quantityScu).toBe(5);
    expect(found?.note).toBe("Rest");
  });

  it("deletes an entry by id", async () => {
    await insertWarehouseEntry(db, makeEntry());

    await deleteWarehouseEntryById(db, "entry-1");

    await expect(listWarehouseEntriesByOwner(db, USER)).resolves.toEqual([]);
  });

  it("round-trips a qualityRating", async () => {
    await insertWarehouseEntry(db, makeEntry({ qualityRating: 720 }));

    const found = await findWarehouseEntryById(db, "entry-1");
    expect(found?.qualityRating).toBe(720);
  });

  it("reads legacy documents that predate the qualityRating field", async () => {
    // Simuliert einen Altbestand: direkt eingefügt, ohne qualityRating.
    await db.collection("warehouseEntries").insertOne({
      id: "legacy",
      ownerUserId: USER,
      oreCode: "QUAN",
      kind: "raw",
      quantityScu: 12,
      location: {
        kind: "custom",
        label: "im Schiff",
      },
      createdAt: "2026-07-10T10:00:00.000Z",
      updatedAt: "2026-07-10T10:00:00.000Z",
    });

    const entries = await listWarehouseEntriesByOwner(db, USER);
    expect(entries).toHaveLength(1);
    expect(entries[0].qualityRating).toBeUndefined();
  });
});
