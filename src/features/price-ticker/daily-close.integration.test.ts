import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import type { PriceSnapshot } from "@/features/refinery-and-prices/refinery-and-prices.schema";
import {
  captureDailyClose,
  getPreviousDayCloses,
} from "./daily-close.repository";
import type { PriceDailyClose } from "./price-ticker.schema";

function makeSnapshot(overrides: Partial<PriceSnapshot> = {}): PriceSnapshot {
  return {
    oreCode: "QUAN",
    kind: "refined",
    terminalId: 32,
    terminalName: "ARC-L1 Wide Forest Station",
    priceBuy: 0,
    priceSell: 88,
    syncedAt: "2026-07-15T08:00:00.000Z",
    ...overrides,
  };
}

function makeClose(overrides: Partial<PriceDailyClose> = {}): PriceDailyClose {
  return {
    oreCode: "QUAN",
    date: "2026-07-15",
    bestSell: 88,
    syncedAt: "2026-07-15T23:30:00.000Z",
    ...overrides,
  };
}

describe("daily-close repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("daily-close"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("captures one close per ore with the best refined sell price", async () => {
    await db.collection("priceSnapshots").insertMany([
      makeSnapshot({ oreCode: "QUAN", priceSell: 88 }),
      makeSnapshot({ oreCode: "QUAN", terminalId: 12, priceSell: 91.5 }),
      makeSnapshot({ oreCode: "GOLD", priceSell: 6.1 }),
      // Raw-Preise und unverkäufliche Einträge zählen nicht
      makeSnapshot({ oreCode: "GOLD", kind: "raw", priceSell: 999 }),
      makeSnapshot({ oreCode: "BEXA", priceSell: 0 }),
    ]);

    const captured = await captureDailyClose(db, "2026-07-15T08:00:00.000Z");

    expect(captured).toBe(2);
    const closes = await db
      .collection("priceDailyCloses")
      .find({}, { projection: { _id: 0 } })
      .sort({ oreCode: 1 })
      .toArray();
    expect(closes).toEqual([
      {
        oreCode: "GOLD",
        date: "2026-07-15",
        bestSell: 6.1,
        syncedAt: "2026-07-15T08:00:00.000Z",
      },
      {
        oreCode: "QUAN",
        date: "2026-07-15",
        bestSell: 91.5,
        syncedAt: "2026-07-15T08:00:00.000Z",
      },
    ]);
  });

  it("overwrites the same day's close on a later sync (rolling close)", async () => {
    await db
      .collection("priceSnapshots")
      .insertMany([makeSnapshot({ priceSell: 88 })]);
    await captureDailyClose(db, "2026-07-15T08:00:00.000Z");

    await db
      .collection("priceSnapshots")
      .updateOne({ oreCode: "QUAN" }, { $set: { priceSell: 92 } });
    await captureDailyClose(db, "2026-07-15T20:00:00.000Z");

    const closes = await db.collection("priceDailyCloses").find({}).toArray();
    expect(closes).toHaveLength(1);
    expect(closes[0]).toMatchObject({
      oreCode: "QUAN",
      date: "2026-07-15",
      bestSell: 92,
      syncedAt: "2026-07-15T20:00:00.000Z",
    });
  });

  it("creates a unique index on { oreCode, date }", async () => {
    await db
      .collection("priceSnapshots")
      .insertMany([makeSnapshot({ priceSell: 88 })]);
    await captureDailyClose(db, "2026-07-15T08:00:00.000Z");

    const indexes = await db.collection("priceDailyCloses").indexes();
    expect(indexes).toContainEqual(
      expect.objectContaining({
        key: { oreCode: 1, date: 1 },
        unique: true,
      }),
    );
  });

  it("prunes closes older than 30 days", async () => {
    await db.collection("priceDailyCloses").insertMany([
      makeClose({ date: "2026-06-14" }), // 31 Tage vor dem Sync — weg
      makeClose({ date: "2026-06-16" }), // innerhalb der Retention — bleibt
    ]);
    await db
      .collection("priceSnapshots")
      .insertMany([makeSnapshot({ priceSell: 88 })]);

    await captureDailyClose(db, "2026-07-15T08:00:00.000Z");

    const dates = (await db.collection("priceDailyCloses").find({}).toArray())
      .map((doc) => doc.date)
      .sort();
    expect(dates).toEqual(["2026-06-16", "2026-07-15"]);
  });

  describe("getPreviousDayCloses", () => {
    it("returns the latest close before today per ore", async () => {
      await db.collection("priceDailyCloses").insertMany([
        makeClose({ oreCode: "QUAN", date: "2026-07-14", bestSell: 85 }),
        makeClose({ oreCode: "QUAN", date: "2026-07-15", bestSell: 91.5 }),
        makeClose({ oreCode: "GOLD", date: "2026-07-15", bestSell: 6.1 }),
        // Heutiger (noch laufender) Tag darf nicht als Referenz dienen
        makeClose({ oreCode: "QUAN", date: "2026-07-16", bestSell: 99 }),
      ]);

      const closes = await getPreviousDayCloses(db, "2026-07-16");

      expect(closes).toEqual(
        new Map([
          ["QUAN", 91.5],
          ["GOLD", 6.1],
        ]),
      );
    });

    it("falls back to the last known close across sync gaps", async () => {
      await db
        .collection("priceDailyCloses")
        .insertMany([makeClose({ date: "2026-07-10", bestSell: 80 })]);

      const closes = await getPreviousDayCloses(db, "2026-07-16");

      expect(closes).toEqual(new Map([["QUAN", 80]]));
    });

    it("returns an empty map on cold start", async () => {
      await expect(getPreviousDayCloses(db, "2026-07-16")).resolves.toEqual(
        new Map(),
      );
    });
  });
});
