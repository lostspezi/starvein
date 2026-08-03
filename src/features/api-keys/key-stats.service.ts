import type { Db } from "mongodb";
import {
  findUsageDays,
  USAGE_RETENTION_DAYS,
  type UsageCounts,
} from "@/features/public-api/api-usage.repository";
import type { UsageRedis } from "@/features/public-api/usage-aggregation.service";

const TOP_ENDPOINT_COUNT = 8;

export type KeyStatsSeriesEntry = {
  /** ISO-Datum "YYYY-MM-DD" (UTC). */
  day: string;
  total: number;
  /** 4xx + 5xx, ohne Rate-Limit-Treffer. */
  errors: number;
  /** 429-Antworten. */
  throttled: number;
};

export type KeyStats = {
  series: KeyStatsSeriesEntry[];
  topEndpoints: { endpoint: string; count: number }[];
  totals: { total: number; errorRatePercent: number; count429: number };
};

type DayAccumulator = UsageCounts & { endpoints: Record<string, number> };

function emptyDay(): DayAccumulator {
  return { total: 0, s2xx: 0, s4xx: 0, s429: 0, s5xx: 0, endpoints: {} };
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Nutzungs-Statistik eines Keys über die Retention (30 Tage): Mongo-
 * Tages-Buckets plus — falls Redis verfügbar — die noch nicht geflushten
 * Stunden-Buckets von heute. Redis-Fehler fallen still auf Mongo-only
 * zurück (Statistiken sind best effort).
 */
export async function getKeyStats(
  db: Db,
  keyId: string,
  options: { redis?: UsageRedis | null; now?: Date } = {},
): Promise<KeyStats> {
  const now = options.now ?? new Date();
  const days = new Map<string, DayAccumulator>();

  // 30 Tage nullen (ältester zuerst), damit das Chart lückenlos ist
  for (let offset = USAGE_RETENTION_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getTime() - offset * 24 * 3600 * 1000);
    days.set(isoDay(date), emptyDay());
  }
  const sinceDay = isoDay(
    new Date(now.getTime() - (USAGE_RETENTION_DAYS - 1) * 24 * 3600 * 1000),
  );

  for (const doc of await findUsageDays(db, keyId, sinceDay)) {
    const entry = days.get(doc.day);
    if (!entry) continue;
    entry.total += doc.total;
    entry.s2xx += doc.s2xx;
    entry.s4xx += doc.s4xx;
    entry.s429 += doc.s429;
    entry.s5xx += doc.s5xx;
    for (const [endpoint, count] of Object.entries(doc.endpoints ?? {})) {
      entry.endpoints[endpoint] = (entry.endpoints[endpoint] ?? 0) + count;
    }
  }

  if (options.redis) {
    try {
      await mergeRedisBuckets(options.redis, keyId, days);
    } catch {
      // Redis nicht erreichbar — Mongo-Stand reicht
    }
  }

  const series: KeyStatsSeriesEntry[] = [];
  const endpointTotals = new Map<string, number>();
  const totals = { total: 0, errors: 0, count429: 0 };
  for (const [day, entry] of days) {
    const errors = entry.s4xx + entry.s5xx;
    series.push({ day, total: entry.total, errors, throttled: entry.s429 });
    totals.total += entry.total;
    totals.errors += errors;
    totals.count429 += entry.s429;
    for (const [endpoint, count] of Object.entries(entry.endpoints)) {
      endpointTotals.set(endpoint, (endpointTotals.get(endpoint) ?? 0) + count);
    }
  }

  return {
    series,
    topEndpoints: [...endpointTotals.entries()]
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count || a.endpoint.localeCompare(b.endpoint))
      .slice(0, TOP_ENDPOINT_COUNT),
    totals: {
      total: totals.total,
      errorRatePercent:
        totals.total === 0
          ? 0
          : Math.round((totals.errors / totals.total) * 1000) / 10,
      count429: totals.count429,
    },
  };
}

/** Noch nicht aggregierte Redis-Stunden-Buckets dieses Keys dazurechnen. */
async function mergeRedisBuckets(
  redis: UsageRedis,
  keyId: string,
  days: Map<string, DayAccumulator>,
): Promise<void> {
  const pattern = new RegExp(
    `^apiusage:h:${keyId}:(\\d{4})(\\d{2})(\\d{2})\\d{2}$`,
  );
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(
      cursor,
      "MATCH",
      `apiusage:h:${keyId}:*`,
      "COUNT",
      100,
    );
    cursor = next;

    for (const key of keys) {
      const match = pattern.exec(key);
      if (!match) continue;
      const entry = days.get(`${match[1]}-${match[2]}-${match[3]}`);
      if (!entry) continue;

      const fields = await redis.hgetall(key);
      entry.total += Number(fields.total ?? 0);
      entry.s2xx += Number(fields.s2xx ?? 0);
      entry.s4xx += Number(fields.s4xx ?? 0);
      entry.s429 += Number(fields.s429 ?? 0);
      entry.s5xx += Number(fields.s5xx ?? 0);
      for (const [field, value] of Object.entries(fields)) {
        if (field.startsWith("ep:")) {
          const endpoint = field.slice(3);
          entry.endpoints[endpoint] =
            (entry.endpoints[endpoint] ?? 0) + Number(value);
        }
      }
    }
  } while (cursor !== "0");
}
