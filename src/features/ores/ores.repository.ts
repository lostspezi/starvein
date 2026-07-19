import type { Db } from "mongodb";
import { CACHE_TAGS, cachedQuery } from "@/lib/data-cache";
import { oreSchema, type Ore } from "./ores.schema";

const COLLECTION = "ores";

/**
 * Backstop gegen unbegrenzte Ergebnismengen bei GET /api/ores. Der Erz-
 * Katalog ist klein und wiki-geführt (Dutzende Einträge); der Cap greift
 * nur im pathologischen Fall und bleibt weit über der realen Anzahl.
 */
export const MAX_ORES = 1000;

/** Für Seiten-Reads: gecachte Variante (Tag wiki-data, siehe data-cache.ts). */
export function findAllOresCached(db: Db): Promise<Ore[]> {
  return cachedQuery(CACHE_TAGS.wiki, ["ores", "all"], () => findAllOres(db));
}

export async function findAllOres(db: Db): Promise<Ore[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({}, { projection: { _id: 0 } })
    .sort({ name_en: 1 })
    .limit(MAX_ORES)
    .toArray();

  return docs.map((doc) => oreSchema.parse(doc));
}

export async function findOreByCode(db: Db, code: string): Promise<Ore | null> {
  const doc = await db
    .collection(COLLECTION)
    .findOne({ code }, { projection: { _id: 0 } });
  return doc ? oreSchema.parse(doc) : null;
}

export async function upsertOres(db: Db, ores: Ore[]): Promise<void> {
  if (ores.length === 0) return;

  await db.collection(COLLECTION).bulkWrite(
    ores.map((ore) => ({
      updateOne: {
        filter: { code: ore.code },
        update: { $set: ore },
        upsert: true,
      },
    })),
  );
}

export async function ensureOreIndexes(db: Db): Promise<void> {
  await db.collection(COLLECTION).createIndex({ code: 1 }, { unique: true });
}

/** Entfernt Erze, die der Wiki-Sync nicht mehr liefert. */
export async function pruneOresNotIn(
  db: Db,
  keepCodes: string[],
): Promise<number> {
  const result = await db
    .collection(COLLECTION)
    .deleteMany({ code: { $nin: keepCodes } });
  return result.deletedCount;
}
