import type { Db } from "mongodb";

const COLLECTION = "apiUsage";

/** Statistik-Retention — danach räumt der Mongo-TTL-Index selbst auf. */
export const USAGE_RETENTION_DAYS = 30;

export type UsageCounts = {
  total: number;
  s2xx: number;
  s4xx: number;
  s429: number;
  s5xx: number;
};

/** Ein Dokument pro Key und Tag (Bucket-Pattern) mit Stunden-Substruktur. */
export type ApiUsageDay = UsageCounts & {
  keyId: string;
  userId: string;
  /** ISO-Datum "YYYY-MM-DD" (UTC) — Query-Schlüssel. */
  day: string;
  /** Echtes Date für den TTL-Index. */
  date: Date;
  hours: Record<string, UsageCounts>;
  endpoints: Record<string, number>;
};

export type UsageIncrement = {
  keyId: string;
  userId: string;
  day: string;
  hour: string;
  counts: UsageCounts;
  endpoints: Record<string, number>;
};

/** Addiert einen geflushten Stunden-Bucket idempotent per $inc-Upsert. */
export async function incrementUsageDay(
  db: Db,
  increment: UsageIncrement,
): Promise<void> {
  const inc: Record<string, number> = {};
  for (const [field, value] of Object.entries(increment.counts)) {
    inc[field] = value;
    inc[`hours.${increment.hour}.${field}`] = value;
  }
  for (const [endpoint, count] of Object.entries(increment.endpoints)) {
    inc[`endpoints.${endpoint}`] = count;
  }

  await db.collection(COLLECTION).updateOne(
    { keyId: increment.keyId, day: increment.day },
    {
      $inc: inc,
      $setOnInsert: {
        userId: increment.userId,
        date: new Date(`${increment.day}T00:00:00.000Z`),
      },
    },
    { upsert: true },
  );
}

/** Tages-Buckets eines Keys ab `sinceDay` (inklusive), aufsteigend. */
export async function findUsageDays(
  db: Db,
  keyId: string,
  sinceDay: string,
): Promise<ApiUsageDay[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({ keyId, day: { $gte: sinceDay } }, { projection: { _id: 0 } })
    .sort({ day: 1 })
    .toArray();
  return docs as unknown as ApiUsageDay[];
}

export async function ensureApiUsageIndexes(db: Db): Promise<void> {
  const collection = db.collection(COLLECTION);
  await collection.createIndex({ keyId: 1, day: 1 }, { unique: true });
  await collection.createIndex(
    { date: 1 },
    { expireAfterSeconds: USAGE_RETENTION_DAYS * 24 * 3600 },
  );
}
