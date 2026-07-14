import type { Db } from "mongodb";
import { warehouseEntrySchema, type WarehouseEntry } from "./warehouse.schema";

const COLLECTION = "warehouseEntries";
const NO_ID = { projection: { _id: 0 } } as const;

export async function insertWarehouseEntry(
  db: Db,
  entry: WarehouseEntry,
): Promise<void> {
  await db.collection(COLLECTION).insertOne({ ...entry });
}

export async function insertWarehouseEntries(
  db: Db,
  entries: WarehouseEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  await db.collection(COLLECTION).insertMany(entries.map((e) => ({ ...e })));
}

export async function findWarehouseEntryById(
  db: Db,
  id: string,
): Promise<WarehouseEntry | null> {
  const doc = await db.collection(COLLECTION).findOne({ id }, NO_ID);
  return doc ? warehouseEntrySchema.parse(doc) : null;
}

export async function replaceWarehouseEntry(
  db: Db,
  entry: WarehouseEntry,
): Promise<void> {
  await db.collection(COLLECTION).replaceOne({ id: entry.id }, entry);
}

export async function deleteWarehouseEntryById(
  db: Db,
  id: string,
): Promise<void> {
  await db.collection(COLLECTION).deleteOne({ id });
}

export async function listWarehouseEntriesByOwner(
  db: Db,
  userId: string,
): Promise<WarehouseEntry[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({ ownerUserId: userId }, NO_ID)
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map((doc) => warehouseEntrySchema.parse(doc));
}
