import type { Db } from "mongodb";
import {
  materialInventorySchema,
  type MaterialInventoryEntry,
} from "./material-inventory.schema";

const COLLECTION = "materialInventory";
const NO_ID = { projection: { _id: 0 } } as const;

const indexedDbs = new Set<string>();

export async function ensureMaterialInventoryIndexes(db: Db): Promise<void> {
  if (indexedDbs.has(db.databaseName)) return;
  await db
    .collection(COLLECTION)
    .createIndex({ userId: 1, materialCode: 1 }, { unique: true });
  indexedDbs.add(db.databaseName);
}

/** Setzt die Menge (kein Increment) — idempotentes PUT. */
export async function setMaterialQuantity(
  db: Db,
  userId: string,
  materialCode: string,
  quantity: number,
): Promise<MaterialInventoryEntry> {
  await ensureMaterialInventoryIndexes(db);
  const entry = materialInventorySchema.parse({
    userId,
    materialCode,
    quantity,
    updatedAt: new Date().toISOString(),
  });

  await db.collection(COLLECTION).updateOne(
    { userId, materialCode },
    {
      $set: { quantity: entry.quantity, updatedAt: entry.updatedAt },
      $setOnInsert: { userId, materialCode },
    },
    { upsert: true },
  );

  return entry;
}

export async function deleteMaterialQuantity(
  db: Db,
  userId: string,
  materialCode: string,
): Promise<void> {
  await db.collection(COLLECTION).deleteOne({ userId, materialCode });
}

export async function listMaterialInventory(
  db: Db,
  userId: string,
): Promise<MaterialInventoryEntry[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({ userId }, NO_ID)
    .sort({ materialCode: 1 })
    .toArray();

  return docs.map((doc) => materialInventorySchema.parse(doc));
}

/** code→quantity für die Craftability-Berechnung. */
export async function getMaterialInventoryMap(
  db: Db,
  userId: string,
): Promise<Map<string, number>> {
  const entries = await listMaterialInventory(db, userId);
  return new Map(entries.map((entry) => [entry.materialCode, entry.quantity]));
}
