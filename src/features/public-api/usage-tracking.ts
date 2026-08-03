import { getRedis } from "@/lib/redis";

/** Redis-Staging-Puffer: 48h reichen, der Cron flusht stündlich nach Mongo. */
const BUCKET_TTL_SECONDS = 48 * 3600;
/** "Zuletzt benutzt" etwas länger als die 30-Tage-Statistik-Retention. */
const LAST_USED_TTL_SECONDS = 40 * 24 * 3600;

export type UsageStatusClass = "s2xx" | "s4xx" | "s429" | "s5xx";

/** Ordnet einen HTTP-Status dem Statistik-Zähler zu (429 separat). */
export function statusClass(status: number): UsageStatusClass {
  if (status === 429) return "s429";
  if (status >= 500) return "s5xx";
  if (status >= 400) return "s4xx";
  return "s2xx";
}

/** Stunden-Bucket-Key (UTC): apiusage:h:{keyId}:{YYYYMMDDHH}. */
export function usageBucketKey(keyId: string, date: Date): string {
  const hour = date.toISOString().slice(0, 13).replace(/[-T]/g, "");
  return `apiusage:h:${keyId}:${hour}`;
}

export type UsageEntry = {
  keyId: string;
  userId: string;
  endpoint: string;
  status: number;
  now?: Date;
};

/**
 * Zählt einen v1-Request im Redis-Stunden-Bucket (eine Pipeline, O(1)).
 * Fire-and-forget: Fehler werden geschluckt, Tracking darf niemals
 * Requests verlangsamen oder scheitern lassen. Aggregation nach MongoDB
 * übernimmt der sync-api-usage-Cron (usage-aggregation.service.ts).
 */
export async function trackUsage(entry: UsageEntry): Promise<void> {
  if (!process.env.REDIS_URL) return;

  try {
    const redis = getRedis();
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }

    const now = entry.now ?? new Date();
    const bucket = usageBucketKey(entry.keyId, now);
    await redis
      .pipeline()
      .hincrby(bucket, "total", 1)
      .hincrby(bucket, statusClass(entry.status), 1)
      .hincrby(bucket, `ep:${entry.endpoint}`, 1)
      .hset(bucket, "userId", entry.userId)
      .expire(bucket, BUCKET_TTL_SECONDS)
      .set(
        `apiusage:last:${entry.keyId}`,
        now.toISOString(),
        "EX",
        LAST_USED_TTL_SECONDS,
      )
      .exec();
  } catch {
    // bewusst geschluckt — Tracking ist best effort
  }
}
