import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/price-ticker/route";
import { closeMongo, getDb } from "@/lib/db";

/**
 * Öffentlicher Ticker-Endpunkt: liefert die Laufband-Einträge für die
 * Client-Komponente — ohne Session, wie GET /api/ores (reines
 * Referenz-Browsing, CLAUDE.md §2).
 */
describe("price ticker route", () => {
  beforeEach(async () => {
    const db = await getDb();
    await db.collection("ores").deleteMany({});
    await db.collection("priceSnapshots").deleteMany({});
    await db.collection("priceDailyCloses").deleteMany({});
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns an empty array when nothing is synced", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it("returns ticker entries with previous-day direction", async () => {
    const db = await getDb();
    await db.collection("ores").insertOne({
      code: "QUAN",
      name_de: "Quantanium",
      name_en: "Quantainium",
      rarityTier: "legendary",
      mineableBy: { ship: true, roc: false, fps: false },
    });
    await db.collection("priceSnapshots").insertOne({
      oreCode: "QUAN",
      kind: "refined",
      terminalId: 32,
      terminalName: "ARC-L1 Wide Forest Station",
      priceBuy: 0,
      priceSell: 91.5,
      syncedAt: "2026-07-16T08:00:00.000Z",
    });
    await db.collection("priceDailyCloses").insertOne({
      oreCode: "QUAN",
      date: "2000-01-01", // liegt sicher vor "heute", egal wann der Test läuft
      bestSell: 85,
      syncedAt: "2000-01-01T23:30:00.000Z",
    });

    const entries = await (await GET()).json();

    expect(entries).toEqual([
      {
        oreCode: "QUAN",
        nameDe: "Quantanium",
        nameEn: "Quantainium",
        bestSell: 91.5,
        prevClose: 85,
        direction: "up",
        changePercent: 7.6,
      },
    ]);
  });
});
