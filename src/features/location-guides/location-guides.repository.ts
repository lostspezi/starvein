import type { Db } from "mongodb";
import {
  locationAreaGuideSchema,
  locationGuideSchema,
  type LocationAreaGuide,
  type LocationGuide,
} from "./location-guides.schema";

const COLLECTION = "locationGuides";
const AREA_COLLECTION = "locationAreaGuides";
const NO_ID = { projection: { _id: 0 } } as const;

export async function findLocationGuide(
  db: Db,
  systemCode: string,
  bodySlug: string,
): Promise<LocationGuide | null> {
  const doc = await db
    .collection(COLLECTION)
    .findOne({ systemCode, bodySlug }, NO_ID);
  return doc ? locationGuideSchema.parse(doc) : null;
}

export async function upsertLocationGuides(
  db: Db,
  guides: LocationGuide[],
): Promise<void> {
  if (guides.length === 0) return;

  await db.collection(COLLECTION).bulkWrite(
    guides.map((guide) => ({
      updateOne: {
        filter: { systemCode: guide.systemCode, bodySlug: guide.bodySlug },
        update: { $set: guide },
        upsert: true,
      },
    })),
  );
}

export async function ensureLocationGuideIndexes(db: Db): Promise<void> {
  await db
    .collection(COLLECTION)
    .createIndex({ systemCode: 1, bodySlug: 1 }, { unique: true });
  await db
    .collection(AREA_COLLECTION)
    .createIndex({ systemCode: 1, bodyType: 1 });
}

/** Flächen-Regeln für ein System + Body-Typ (Namensmuster wird im Service gematcht). */
export async function findLocationAreaGuides(
  db: Db,
  systemCode: string,
  bodyType: string,
): Promise<LocationAreaGuide[]> {
  const docs = await db
    .collection(AREA_COLLECTION)
    .find({ systemCode, bodyType }, NO_ID)
    .toArray();
  return docs.map((doc) => locationAreaGuideSchema.parse(doc));
}

export async function upsertLocationAreaGuides(
  db: Db,
  areaGuides: LocationAreaGuide[],
): Promise<void> {
  if (areaGuides.length === 0) return;

  await db.collection(AREA_COLLECTION).bulkWrite(
    areaGuides.map((area) => ({
      updateOne: {
        filter: {
          systemCode: area.systemCode,
          bodyType: area.bodyType,
          namePattern: area.namePattern,
        },
        update: { $set: area },
        upsert: true,
      },
    })),
  );
}
