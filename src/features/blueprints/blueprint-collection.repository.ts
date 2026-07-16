import type { Db } from "mongodb";
import {
  blueprintCollectionSchema,
  type CollectedBlueprint,
} from "./blueprint-collection.schema";

const COLLECTION = "blueprintCollection";
const NO_ID = { projection: { _id: 0 } } as const;

const indexedDbs = new Set<string>();

export async function ensureBlueprintCollectionIndexes(db: Db): Promise<void> {
  if (indexedDbs.has(db.databaseName)) return;
  await db
    .collection(COLLECTION)
    .createIndex({ userId: 1, blueprintKey: 1 }, { unique: true });
  indexedDbs.add(db.databaseName);
}

export async function addCollectedBlueprint(
  db: Db,
  userId: string,
  blueprintKey: string,
): Promise<void> {
  await ensureBlueprintCollectionIndexes(db);
  const entry = blueprintCollectionSchema.parse({
    userId,
    blueprintKey,
    collectedAt: new Date().toISOString(),
  });

  // $setOnInsert: erneutes Sammeln überschreibt collectedAt nicht.
  await db
    .collection(COLLECTION)
    .updateOne(
      { userId, blueprintKey },
      { $setOnInsert: entry },
      { upsert: true },
    );
}

export async function removeCollectedBlueprint(
  db: Db,
  userId: string,
  blueprintKey: string,
): Promise<void> {
  await db.collection(COLLECTION).deleteOne({ userId, blueprintKey });
}

export async function listCollectedBlueprints(
  db: Db,
  userId: string,
): Promise<CollectedBlueprint[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({ userId }, NO_ID)
    .sort({ collectedAt: -1 })
    .toArray();

  return docs.map((doc) => blueprintCollectionSchema.parse(doc));
}

/** Nur die Keys — für Lookups (z. B. "gesammelt?"-Badges in Listen). */
export async function listCollectedBlueprintKeys(
  db: Db,
  userId: string,
): Promise<Set<string>> {
  const entries = await listCollectedBlueprints(db, userId);
  return new Set(entries.map((entry) => entry.blueprintKey));
}

export async function isBlueprintCollected(
  db: Db,
  userId: string,
  blueprintKey: string,
): Promise<boolean> {
  const doc = await db
    .collection(COLLECTION)
    .findOne({ userId, blueprintKey }, NO_ID);
  return doc !== null;
}
