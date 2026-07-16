import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { upsertOres } from "@/features/ores/ores.repository";
import type { Ore } from "@/features/ores/ores.schema";
import type { PriceSnapshot } from "@/features/refinery-and-prices/refinery-and-prices.schema";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import type { PriceDailyClose } from "./price-ticker.schema";
import { getTickerEntries } from "./ticker.service";

const TODAY = "2026-07-16";

function makeOre(overrides: Partial<Ore> & Pick<Ore, "code">): Ore {
  return {
    name_de: overrides.code,
    name_en: overrides.code,
    rarityTier: "common",
    mineableBy: { ship: true, roc: false, fps: false },
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<PriceSnapshot> = {}): PriceSnapshot {
  return {
    oreCode: "QUAN",
    kind: "refined",
    terminalId: 32,
    terminalName: "ARC-L1 Wide Forest Station",
    priceBuy: 0,
    priceSell: 88,
    syncedAt: "2026-07-16T08:00:00.000Z",
    ...overrides,
  };
}

function makeClose(overrides: Partial<PriceDailyClose> = {}): PriceDailyClose {
  return {
    oreCode: "QUAN",
    date: "2026-07-15",
    bestSell: 85,
    syncedAt: "2026-07-15T23:30:00.000Z",
    ...overrides,
  };
}

describe("getTickerEntries", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("ticker-service"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns an empty array when nothing is synced", async () => {
    await expect(getTickerEntries(db, TODAY)).resolves.toEqual([]);
  });

  it("joins prices, names and previous-day closes into ticker entries", async () => {
    await upsertOres(db, [
      makeOre({ code: "QUAN", name_de: "Quantanium", name_en: "Quantainium" }),
      makeOre({ code: "GOLD", name_de: "Gold", name_en: "Gold" }),
      makeOre({ code: "IRON", name_de: "Eisen", name_en: "Iron" }),
      makeOre({ code: "LARA", name_de: "Laranite", name_en: "Laranite" }),
      makeOre({ code: "BEXA", name_de: "Bexalite", name_en: "Bexalite" }),
    ]);
    await db.collection("priceSnapshots").insertMany([
      makeSnapshot({ oreCode: "QUAN", priceSell: 88 }),
      makeSnapshot({ oreCode: "QUAN", terminalId: 12, priceSell: 91.5 }),
      makeSnapshot({ oreCode: "GOLD", priceSell: 6.1 }),
      makeSnapshot({ oreCode: "IRON", priceSell: 300 }),
      makeSnapshot({ oreCode: "LARA", priceSell: 50 }),
      // Raw zählt nicht als Ticker-Preis
      makeSnapshot({ oreCode: "BEXA", kind: "raw", priceSell: 999 }),
    ]);
    await db.collection("priceDailyCloses").insertMany([
      makeClose({ oreCode: "QUAN", bestSell: 85 }), // -> up
      makeClose({ oreCode: "GOLD", bestSell: 6.1 }), // -> same
      makeClose({ oreCode: "LARA", bestSell: 60 }), // -> down
      // IRON hat keinen Vortageswert -> direction null
      // Heutiger Close darf die Referenz nicht verfälschen
      makeClose({ oreCode: "QUAN", date: TODAY, bestSell: 91.5 }),
    ]);

    const entries = await getTickerEntries(db, TODAY);

    // Sortierung: bestSell absteigend
    expect(entries.map((entry) => entry.oreCode)).toEqual([
      "IRON",
      "QUAN",
      "LARA",
      "GOLD",
    ]);
    expect(entries[0]).toEqual({
      oreCode: "IRON",
      nameDe: "Eisen",
      nameEn: "Iron",
      bestSell: 300,
      prevClose: null,
      direction: null,
      changePercent: null,
    });
    expect(entries[1]).toEqual({
      oreCode: "QUAN",
      nameDe: "Quantanium",
      nameEn: "Quantainium",
      bestSell: 91.5,
      prevClose: 85,
      direction: "up",
      changePercent: 7.6,
    });
    expect(entries[2]).toEqual({
      oreCode: "LARA",
      nameDe: "Laranite",
      nameEn: "Laranite",
      bestSell: 50,
      prevClose: 60,
      direction: "down",
      changePercent: -16.7,
    });
    expect(entries[3]).toMatchObject({
      oreCode: "GOLD",
      direction: "same",
      changePercent: 0,
    });
  });

  it("breaks bestSell ties by ore code", async () => {
    await upsertOres(db, [makeOre({ code: "TIN" }), makeOre({ code: "COPP" })]);
    await db
      .collection("priceSnapshots")
      .insertMany([
        makeSnapshot({ oreCode: "TIN", priceSell: 4 }),
        makeSnapshot({ oreCode: "COPP", priceSell: 4 }),
      ]);

    const entries = await getTickerEntries(db, TODAY);
    expect(entries.map((entry) => entry.oreCode)).toEqual(["COPP", "TIN"]);
  });

  it("skips ores that have a price but no ore document", async () => {
    await db
      .collection("priceSnapshots")
      .insertMany([makeSnapshot({ oreCode: "QUAN", priceSell: 88 })]);

    await expect(getTickerEntries(db, TODAY)).resolves.toEqual([]);
  });
});
