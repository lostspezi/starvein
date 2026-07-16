import type { Db } from "mongodb";
import { blueprintSchema, type Blueprint } from "./blueprints.schema";

const COLLECTION = "blueprints";
const NO_ID = { projection: { _id: 0 } } as const;
const SORT = { outputName: 1 } as const;

export async function findAllBlueprints(db: Db): Promise<Blueprint[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({}, NO_ID)
    .sort(SORT)
    .toArray();

  return docs.map((doc) => blueprintSchema.parse(doc));
}

export async function countBlueprints(db: Db): Promise<number> {
  return db.collection(COLLECTION).countDocuments();
}

export async function findBlueprintBySlug(
  db: Db,
  slug: string,
): Promise<Blueprint | null> {
  const doc = await db.collection(COLLECTION).findOne({ slug }, NO_ID);
  return doc ? blueprintSchema.parse(doc) : null;
}

export async function findBlueprintByKey(
  db: Db,
  key: string,
): Promise<Blueprint | null> {
  const doc = await db.collection(COLLECTION).findOne({ key }, NO_ID);
  return doc ? blueprintSchema.parse(doc) : null;
}

/** Reverse-Lookup: welche Blueprints verwenden dieses Material? (Multikey-Index) */
export async function findBlueprintsByMaterialCode(
  db: Db,
  materialCode: string,
): Promise<Blueprint[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({ "ingredients.materialCode": materialCode }, NO_ID)
    .sort(SORT)
    .toArray();

  return docs.map((doc) => blueprintSchema.parse(doc));
}

/** Reverse-Lookup über mehrere Materialien (z. B. alle Materialien eines Erzes). */
export async function findBlueprintsByMaterialCodes(
  db: Db,
  materialCodes: string[],
): Promise<Blueprint[]> {
  if (materialCodes.length === 0) return [];

  const docs = await db
    .collection(COLLECTION)
    .find({ "ingredients.materialCode": { $in: materialCodes } }, NO_ID)
    .sort(SORT)
    .toArray();

  return docs.map((doc) => blueprintSchema.parse(doc));
}

export async function upsertBlueprints(
  db: Db,
  blueprints: Blueprint[],
): Promise<void> {
  if (blueprints.length === 0) return;

  await db.collection(COLLECTION).bulkWrite(
    blueprints.map((blueprint) => ({
      updateOne: {
        filter: { key: blueprint.key },
        update: { $set: blueprint },
        upsert: true,
      },
    })),
  );
}

/**
 * Entfernt Blueprints, die der aktuelle Sync nicht mehr liefert (z. B. aus
 * dem Spiel entfernt). Ohne Prune blieben Karteileichen stehen.
 */
export async function pruneBlueprintsNotIn(
  db: Db,
  keepKeys: string[],
): Promise<number> {
  const result = await db
    .collection(COLLECTION)
    .deleteMany({ key: { $nin: keepKeys } });
  return result.deletedCount;
}

export async function ensureBlueprintIndexes(db: Db): Promise<void> {
  const collection = db.collection(COLLECTION);
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ slug: 1 }, { unique: true });
  await collection.createIndex({ "ingredients.materialCode": 1 });
  await collection.createIndex({ category: 1 });
}
