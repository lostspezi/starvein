import type { Db } from "mongodb";
import { materialSchema, type Material } from "./materials.schema";

const COLLECTION = "materials";
const NO_ID = { projection: { _id: 0 } } as const;
const SORT = { name: 1 } as const;

export async function findAllMaterials(db: Db): Promise<Material[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({}, NO_ID)
    .sort(SORT)
    .toArray();

  return docs.map((doc) => materialSchema.parse(doc));
}

export async function findMaterialByCode(
  db: Db,
  code: string,
): Promise<Material | null> {
  const doc = await db.collection(COLLECTION).findOne({ code }, NO_ID);
  return doc ? materialSchema.parse(doc) : null;
}

/** Alle Materialien, die einem Erz-Code zugeordnet sind (für Erz→Blueprint-Panel). */
export async function findMaterialsByOreCode(
  db: Db,
  oreCode: string,
): Promise<Material[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({ oreCode }, NO_ID)
    .sort(SORT)
    .toArray();

  return docs.map((doc) => materialSchema.parse(doc));
}

export async function upsertMaterials(
  db: Db,
  materials: Material[],
): Promise<void> {
  if (materials.length === 0) return;

  await db.collection(COLLECTION).bulkWrite(
    materials.map((material) => ({
      updateOne: {
        filter: { code: material.code },
        update: { $set: material },
        upsert: true,
      },
    })),
  );
}

/**
 * Entfernt Materialien, die der aktuelle Sync nicht mehr liefert.
 * Der Katalog ist vollständig vom Wiki abgeleitet — ohne Prune blieben
 * Karteileichen aus früheren Patches stehen.
 */
export async function pruneMaterialsNotIn(
  db: Db,
  keepCodes: string[],
): Promise<number> {
  const result = await db
    .collection(COLLECTION)
    .deleteMany({ code: { $nin: keepCodes } });
  return result.deletedCount;
}

export async function ensureMaterialIndexes(db: Db): Promise<void> {
  const collection = db.collection(COLLECTION);
  await collection.createIndex({ code: 1 }, { unique: true });
  await collection.createIndex({ oreCode: 1 });
}
