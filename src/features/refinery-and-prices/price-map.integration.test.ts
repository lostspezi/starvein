import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { getBestRefinedSellByOre, getBestSellByOre } from "./price-summary";

function snapshot(
  oreCode: string,
  kind: "raw" | "refined",
  priceSell: number,
  terminalId: number,
) {
  return {
    oreCode,
    kind,
    terminalId,
    terminalName: `Terminal ${terminalId}`,
    priceBuy: 0,
    priceSell,
    syncedAt: "2026-07-09T10:00:00.000Z",
  };
}

describe("getBestRefinedSellByOre", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("price-map"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns the best refined sell price per ore", async () => {
    await db.collection("priceSnapshots").insertMany([
      snapshot("GOLD", "refined", 28000, 1),
      snapshot("GOLD", "refined", 25000, 2),
      snapshot("GOLD", "raw", 99000, 3), // raw zählt nicht
      snapshot("IRON", "refined", 3300, 4),
      snapshot("QUAN", "refined", 0, 5), // 0 = kein Verkauf, ignorieren
    ]);

    const map = await getBestRefinedSellByOre(db);

    expect(map.get("GOLD")).toBe(28000);
    expect(map.get("IRON")).toBe(3300);
    expect(map.has("QUAN")).toBe(false);
  });

  it("returns an empty map when nothing was synced", async () => {
    const map = await getBestRefinedSellByOre(db);
    expect(map.size).toBe(0);
  });
});

describe("getBestSellByOre", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("price-map-both"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns the best raw and refined sell price per ore", async () => {
    await db.collection("priceSnapshots").insertMany([
      snapshot("GOLD", "refined", 28000, 1),
      snapshot("GOLD", "refined", 25000, 2),
      snapshot("GOLD", "raw", 15000, 3),
      snapshot("GOLD", "raw", 17000, 4),
      snapshot("IRON", "refined", 3300, 5), // kein raw-Preis
      snapshot("HADA", "raw", 8000, 6), // kein refined-Preis
      snapshot("QUAN", "refined", 0, 7), // 0 = kein Verkauf, ignorieren
    ]);

    const map = await getBestSellByOre(db);

    expect(map.get("GOLD")).toEqual({ raw: 17000, refined: 28000 });
    expect(map.get("IRON")).toEqual({ raw: null, refined: 3300 });
    expect(map.get("HADA")).toEqual({ raw: 8000, refined: null });
    expect(map.has("QUAN")).toBe(false);
  });

  it("returns an empty map when nothing was synced", async () => {
    const map = await getBestSellByOre(db);
    expect(map.size).toBe(0);
  });
});
