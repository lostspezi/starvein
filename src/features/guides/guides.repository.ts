import type { Db, Filter, Document, Sort } from "mongodb";
import { guideSchema, type Guide } from "./guides.schema";

const COLLECTION = "guides";
const NO_ID = { projection: { _id: 0 } } as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const GUIDE_SORTS = ["new", "title"] as const;
export type GuideSort = (typeof GUIDE_SORTS)[number];

export type PublicGuideQuery = {
  q?: string;
  /** Tag-Filter mit ODER-Semantik: Guide muss mind. einen Tag enthalten. */
  tags?: string[];
  sort?: GuideSort;
  limit?: number;
};

export async function insertGuide(db: Db, guide: Guide): Promise<void> {
  await db.collection(COLLECTION).insertOne({ ...guide });
}

export async function findGuideById(db: Db, id: string): Promise<Guide | null> {
  const doc = await db.collection(COLLECTION).findOne({ id }, NO_ID);
  return doc ? guideSchema.parse(doc) : null;
}

export async function replaceGuide(db: Db, guide: Guide): Promise<void> {
  await db.collection(COLLECTION).updateOne({ id: guide.id }, { $set: guide });
}

export async function deleteGuideById(db: Db, id: string): Promise<void> {
  await db.collection(COLLECTION).deleteOne({ id });
}

export async function listPublicGuides(
  db: Db,
  query: PublicGuideQuery = {},
): Promise<Guide[]> {
  const filter: Filter<Document> = { isPublic: true };
  const tags = query.tags
    ?.map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  if (tags && tags.length > 0) {
    filter.tags = { $in: tags };
  }
  if (query.q?.trim()) {
    // Substring-Suche über das vorberechnete searchText-Feld
    // (Titel + Beschreibung + Fließtext, kleingeschrieben).
    filter.searchText = {
      $regex: escapeRegex(query.q.trim().toLowerCase()),
      $options: "i",
    };
  }

  const sort: Sort = query.sort === "title" ? { title: 1 } : { updatedAt: -1 };

  let cursor = db.collection(COLLECTION).find(filter, NO_ID).sort(sort);
  if (query.limit) cursor = cursor.limit(query.limit);
  const docs = await cursor.toArray();
  return docs.map((doc) => guideSchema.parse(doc));
}

/** Obergrenze der im Tag-Filter angezeigten Tags. */
export const GUIDE_TAG_FILTER_LIMIT = 10;

/**
 * Die am häufigsten in öffentlichen Guides verwendeten Tags (absteigend nach
 * Häufigkeit, bei Gleichstand alphabetisch), gekappt auf die Top 10 — als
 * Auswahl für den Tag-Filter.
 */
export async function listPublicGuideTags(db: Db): Promise<string[]> {
  const rows = await db
    .collection(COLLECTION)
    .aggregate<{ _id: string }>([
      { $match: { isPublic: true } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: GUIDE_TAG_FILTER_LIMIT },
    ])
    .toArray();
  return rows.map((row) => row._id);
}

export async function listGuidesByOwner(
  db: Db,
  userId: string,
): Promise<Guide[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({ ownerUserId: userId }, NO_ID)
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map((doc) => guideSchema.parse(doc));
}
