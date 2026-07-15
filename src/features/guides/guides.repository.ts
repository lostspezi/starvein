import type { Db, Document, Filter } from "mongodb";
import {
  GUIDE_FALLBACK_LANGUAGE,
  GUIDE_LANGUAGES,
  type GuideLanguage,
} from "./guides.languages";
import { guideSchema, pickGuideTranslation, type Guide } from "./guides.schema";

const COLLECTION = "guides";
const NO_ID = { projection: { _id: 0 } } as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wickelt Alt-Dokumente (flaches title/description/content vor der i18n-
 * Umstellung) in die translations-Form, damit Reads nie brechen. Das
 * Dokument heilt sich beim nächsten Speichern selbst.
 */
function normalizeGuideDoc(doc: Document): Document {
  if (Array.isArray(doc.translations)) return doc;
  return {
    ...doc,
    translations: [
      {
        language: GUIDE_FALLBACK_LANGUAGE,
        title: doc.title,
        description: doc.description,
        content: doc.content,
        searchText: doc.searchText ?? "",
      },
    ],
  };
}

function parseGuide(doc: Document): Guide {
  return guideSchema.parse(normalizeGuideDoc(doc));
}

export const GUIDE_SORTS = ["new", "title"] as const;
export type GuideSort = (typeof GUIDE_SORTS)[number];

export type PublicGuideQuery = {
  q?: string;
  /** Tag-Filter mit ODER-Semantik: Guide muss mind. einen Tag enthalten. */
  tags?: string[];
  /** Sprachfilter; undefined = alle Sprachen. */
  language?: GuideLanguage;
  sort?: GuideSort;
  limit?: number;
};

export async function insertGuide(db: Db, guide: Guide): Promise<void> {
  await db.collection(COLLECTION).insertOne({ ...guide });
}

export async function findGuideById(db: Db, id: string): Promise<Guide | null> {
  const doc = await db.collection(COLLECTION).findOne({ id }, NO_ID);
  return doc ? parseGuide(doc) : null;
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

  const q = query.q?.trim().toLowerCase();
  const language = query.language;
  const regex = q ? { $regex: escapeRegex(q), $options: "i" } : undefined;

  if (language && regex) {
    // gleiche Übersetzung muss Sprache UND Suchtext erfüllen
    filter.translations = { $elemMatch: { language, searchText: regex } };
  } else if (language) {
    filter["translations.language"] = language;
  } else if (regex) {
    filter["translations.searchText"] = regex;
  }

  const docs = await db.collection(COLLECTION).find(filter, NO_ID).toArray();
  let guides = docs.map(parseGuide);

  // Sortierung in JS über die Anzeige-Übersetzung (Titel ist pro Sprache)
  const displayLanguage = language ?? GUIDE_FALLBACK_LANGUAGE;
  guides =
    query.sort === "title"
      ? guides.sort((a, b) =>
          pickGuideTranslation(a, displayLanguage).title.localeCompare(
            pickGuideTranslation(b, displayLanguage).title,
          ),
        )
      : guides.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return query.limit ? guides.slice(0, query.limit) : guides;
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

/** In öffentlichen Guides tatsächlich vorkommende Sprachen (Preset-Reihenfolge). */
export async function listPublicGuideLanguages(
  db: Db,
): Promise<GuideLanguage[]> {
  const values = await db
    .collection(COLLECTION)
    .distinct("translations.language", { isPublic: true });
  const present = new Set(values as string[]);
  return GUIDE_LANGUAGES.filter((language) => present.has(language));
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
  return docs.map(parseGuide);
}
