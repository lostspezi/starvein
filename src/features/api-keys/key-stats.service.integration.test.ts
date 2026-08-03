import type { Db } from "mongodb";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { incrementUsageDay } from "@/features/public-api/api-usage.repository";
import type { UsageRedis } from "@/features/public-api/usage-aggregation.service";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { getKeyStats } from "./key-stats.service";

const now = new Date("2026-08-03T14:10:00Z");

function fakeRedis(buckets: Record<string, Record<string, string>>) {
  let scanned = false;
  const redis: UsageRedis = {
    scan: async () => {
      if (scanned) return ["0", []];
      scanned = true;
      return ["0", Object.keys(buckets)];
    },
    hgetall: async (key: string) => buckets[key] ?? {},
    del: async () => 0,
  };
  return redis;
}

describe("getKeyStats", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("key-stats"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("builds a zero-filled 30-day series from mongo buckets", async () => {
    await incrementUsageDay(db, {
      keyId: "k1",
      userId: "u1",
      day: "2026-08-02",
      hour: "10",
      counts: { total: 10, s2xx: 7, s4xx: 2, s429: 1, s5xx: 0 },
      endpoints: { ores: 6, signatures: 4 },
    });

    const stats = await getKeyStats(db, "k1", { now });

    expect(stats.series).toHaveLength(30);
    expect(stats.series[0].day).toBe("2026-07-05");
    expect(stats.series[29].day).toBe("2026-08-03");
    const aug2 = stats.series.find((entry) => entry.day === "2026-08-02");
    expect(aug2).toMatchObject({ total: 10, errors: 2, throttled: 1 });
    expect(stats.totals).toEqual({
      total: 10,
      errorRatePercent: 20,
      count429: 1,
    });
    expect(stats.topEndpoints).toEqual([
      { endpoint: "ores", count: 6 },
      { endpoint: "signatures", count: 4 },
    ]);
  });

  it("merges unflushed redis hour buckets into today", async () => {
    await incrementUsageDay(db, {
      keyId: "k1",
      userId: "u1",
      day: "2026-08-03",
      hour: "10",
      counts: { total: 5, s2xx: 5, s4xx: 0, s429: 0, s5xx: 0 },
      endpoints: { ores: 5 },
    });
    const redis = fakeRedis({
      "apiusage:h:k1:2026080314": {
        userId: "u1",
        total: "3",
        s2xx: "2",
        s5xx: "1",
        "ep:ores": "3",
      },
    });

    const stats = await getKeyStats(db, "k1", { now, redis });

    const today = stats.series.find((entry) => entry.day === "2026-08-03");
    expect(today).toMatchObject({ total: 8, errors: 1, throttled: 0 });
    expect(stats.totals.total).toBe(8);
    expect(stats.topEndpoints).toEqual([{ endpoint: "ores", count: 8 }]);
  });

  it("returns an all-zero shape for an unused key", async () => {
    const stats = await getKeyStats(db, "unknown", { now });
    expect(stats.series).toHaveLength(30);
    expect(stats.totals).toEqual({
      total: 0,
      errorRatePercent: 0,
      count429: 0,
    });
    expect(stats.topEndpoints).toEqual([]);
  });
});
