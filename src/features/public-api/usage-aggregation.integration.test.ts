import type { Db } from "mongodb";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { findUsageDays } from "./api-usage.repository";
import {
  aggregateApiUsage,
  type UsageRedis,
} from "./usage-aggregation.service";

function fakeRedis(buckets: Record<string, Record<string, string>>) {
  const deleted: string[] = [];
  // Ein einziger SCAN-Durchlauf reicht für den Test
  let scanned = false;
  const redis: UsageRedis = {
    scan: async () => {
      if (scanned) return ["0", []];
      scanned = true;
      return ["0", Object.keys(buckets)];
    },
    hgetall: async (key: string) => buckets[key] ?? {},
    del: async (key: string) => {
      deleted.push(key);
      return 1;
    },
  };
  return { redis, deleted };
}

describe("aggregateApiUsage", () => {
  let db: Db;
  const now = new Date("2026-08-03T14:10:00Z");

  beforeEach(async () => {
    db = await getDb(uniqueDbName("api-usage-agg"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("flushes closed hour buckets to mongo and deletes them", async () => {
    const { redis, deleted } = fakeRedis({
      "apiusage:h:k1:2026080313": {
        userId: "u1",
        total: "10",
        s2xx: "8",
        s4xx: "1",
        s429: "1",
        "ep:ores": "6",
        "ep:prices/{oreCode}": "4",
      },
    });

    const result = await aggregateApiUsage(db, redis, now);
    expect(result.flushedBuckets).toBe(1);
    expect(deleted).toEqual(["apiusage:h:k1:2026080313"]);

    const days = await findUsageDays(db, "k1", "2026-08-01");
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({
      userId: "u1",
      day: "2026-08-03",
      total: 10,
      s2xx: 8,
      s4xx: 1,
      s429: 1,
      s5xx: 0,
    });
    expect(days[0].hours["13"].total).toBe(10);
    expect(days[0].endpoints.ores).toBe(6);
  });

  it("skips the still-open current hour", async () => {
    const { redis, deleted } = fakeRedis({
      "apiusage:h:k1:2026080314": { userId: "u1", total: "3", s2xx: "3" },
    });

    const result = await aggregateApiUsage(db, redis, now);
    expect(result.flushedBuckets).toBe(0);
    expect(deleted).toEqual([]);
    expect(await findUsageDays(db, "k1", "2026-08-01")).toHaveLength(0);
  });
});
