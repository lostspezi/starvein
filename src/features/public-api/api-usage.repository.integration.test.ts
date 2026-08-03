import type { Db } from "mongodb";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  ensureApiUsageIndexes,
  findUsageDays,
  incrementUsageDay,
} from "./api-usage.repository";

describe("api-usage repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("api-usage"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("accumulates hour counts into a daily bucket document", async () => {
    await incrementUsageDay(db, {
      keyId: "k1",
      userId: "u1",
      day: "2026-08-03",
      hour: "13",
      counts: { total: 10, s2xx: 8, s4xx: 1, s429: 1, s5xx: 0 },
      endpoints: { ores: 6, "prices/{oreCode}": 4 },
    });
    await incrementUsageDay(db, {
      keyId: "k1",
      userId: "u1",
      day: "2026-08-03",
      hour: "14",
      counts: { total: 5, s2xx: 5, s4xx: 0, s429: 0, s5xx: 0 },
      endpoints: { ores: 5 },
    });

    const days = await findUsageDays(db, "k1", "2026-07-05");
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({
      keyId: "k1",
      userId: "u1",
      day: "2026-08-03",
      total: 15,
      s2xx: 13,
      s4xx: 1,
      s429: 1,
      s5xx: 0,
    });
    expect(days[0].hours["13"].total).toBe(10);
    expect(days[0].hours["14"].total).toBe(5);
    expect(days[0].endpoints.ores).toBe(11);
    expect(days[0].endpoints["prices/{oreCode}"]).toBe(4);
  });

  it("only returns days for the requested key since the cutoff", async () => {
    const base = {
      userId: "u1",
      hour: "01",
      counts: { total: 1, s2xx: 1, s4xx: 0, s429: 0, s5xx: 0 },
      endpoints: { ores: 1 },
    };
    await incrementUsageDay(db, { ...base, keyId: "k1", day: "2026-07-01" });
    await incrementUsageDay(db, { ...base, keyId: "k1", day: "2026-08-02" });
    await incrementUsageDay(db, { ...base, keyId: "other", day: "2026-08-02" });

    const days = await findUsageDays(db, "k1", "2026-07-05");
    expect(days).toHaveLength(1);
    expect(days[0].day).toBe("2026-08-02");
  });

  it("creates a unique key/day index and a 30-day TTL index", async () => {
    await ensureApiUsageIndexes(db);
    const indexes = await db.collection("apiUsage").indexes();

    const unique = indexes.find(
      (index) => index.key.keyId === 1 && index.key.day === 1,
    );
    expect(unique?.unique).toBe(true);

    const ttl = indexes.find((index) => index.key.date === 1);
    expect(ttl?.expireAfterSeconds).toBe(30 * 24 * 3600);
  });
});
