import type { Db } from "mongodb";
import {
  ensureApiUsageIndexes,
  incrementUsageDay,
  type UsageCounts,
} from "./api-usage.repository";
import { usageBucketKey } from "./usage-tracking";

/** Minimales Redis-Interface — erleichtert Tests ohne echten Server. */
export type UsageRedis = {
  scan: (
    cursor: string,
    matchToken: "MATCH",
    pattern: string,
    countToken: "COUNT",
    count: number,
  ) => Promise<[string, string[]]>;
  hgetall: (key: string) => Promise<Record<string, string>>;
  del: (key: string) => Promise<number>;
};

const BUCKET_PATTERN = /^apiusage:h:(.+):(\d{4})(\d{2})(\d{2})(\d{2})$/;

function toCounts(fields: Record<string, string>): UsageCounts {
  const num = (name: string) => Number(fields[name] ?? 0);
  return {
    total: num("total"),
    s2xx: num("s2xx"),
    s4xx: num("s4xx"),
    s429: num("s429"),
    s5xx: num("s5xx"),
  };
}

function toEndpoints(fields: Record<string, string>): Record<string, number> {
  const endpoints: Record<string, number> = {};
  for (const [field, value] of Object.entries(fields)) {
    if (field.startsWith("ep:")) {
      endpoints[field.slice(3)] = Number(value);
    }
  }
  return endpoints;
}

/**
 * Flusht alle geschlossenen Stunden-Buckets aus Redis nach MongoDB
 * ($inc-Upsert ins Tages-Dokument) und löscht sie. Die offene aktuelle
 * Stunde bleibt liegen. Crash zwischen inc und del doppelt schlimmstenfalls
 * einen Stunden-Bucket — für ein Nutzungs-Dashboard akzeptabel.
 */
export async function aggregateApiUsage(
  db: Db,
  redis: UsageRedis,
  now: Date = new Date(),
): Promise<{ flushedBuckets: number }> {
  // Idempotent und billig — sichert unique- und TTL-Index (30d Retention)
  await ensureApiUsageIndexes(db);

  const openBucketSuffix = usageBucketKey("", now).split(":").pop();
  let flushed = 0;
  let cursor = "0";

  do {
    const [next, keys] = await redis.scan(
      cursor,
      "MATCH",
      "apiusage:h:*",
      "COUNT",
      100,
    );
    cursor = next;

    for (const key of keys) {
      const match = BUCKET_PATTERN.exec(key);
      if (!match) continue;
      const [, keyId, year, month, dayOfMonth, hour] = match;
      if (`${year}${month}${dayOfMonth}${hour}` === openBucketSuffix) continue;

      const fields = await redis.hgetall(key);
      if (fields.total) {
        await incrementUsageDay(db, {
          keyId,
          userId: fields.userId ?? "",
          day: `${year}-${month}-${dayOfMonth}`,
          hour,
          counts: toCounts(fields),
          endpoints: toEndpoints(fields),
        });
      }
      await redis.del(key);
      flushed += 1;
    }
  } while (cursor !== "0");

  return { flushedBuckets: flushed };
}
