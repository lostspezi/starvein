import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { upsertCelestialBodies } from "@/features/locations/locations.repository";
import { upsertOreOccurrences } from "@/features/ore-occurrences/ore-occurrences.repository";
import { upsertOres } from "@/features/ores/ores.repository";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { findExplorerRows } from "./explorer.service";

const NO_FILTERS = { method: null, system: null, ore: null, rarity: null };

describe("explorer service", () => {
  let db: Db;

  beforeAll(async () => {
    db = await getDb(uniqueDbName("explorer"));

    await upsertOres(db, [
      {
        code: "HADA",
        name_de: "Hadanite",
        name_en: "Hadanite",
        rarityTier: "epic",
        mineableBy: { ship: false, roc: true, fps: true },
      },
      {
        code: "GOLD",
        name_de: "Gold",
        name_en: "Gold",
        rarityTier: "rare",
        mineableBy: { ship: true, roc: false, fps: false },
      },
    ]);
    await upsertCelestialBodies(db, [
      {
        slug: "daymar",
        systemCode: "STANTON",
        type: "moon",
        name: "Daymar",
        parentSlug: "crusader",
        uexId: 25,
      },
      {
        slug: "monox",
        systemCode: "PYRO",
        type: "planet",
        name: "Monox",
        parentSlug: null,
        uexId: 241,
      },
    ]);
    await upsertOreOccurrences(db, [
      {
        oreCode: "HADA",
        systemCode: "STANTON",
        bodySlug: "daymar",
        method: "fps",
        probabilityPercent: 20,
        patchVersion: "4.7",
        sourceType: "curated",
        confidenceScore: 0.3,
        lastVerifiedAt: "2026-07-09",
      },
      {
        oreCode: "GOLD",
        systemCode: "PYRO",
        bodySlug: "monox",
        method: "ship",
        probabilityPercent: 12,
        patchVersion: "4.7",
        sourceType: "curated",
        confidenceScore: 0.3,
        lastVerifiedAt: "2026-07-09",
      },
    ]);
    await db.collection("priceSnapshots").insertOne({
      oreCode: "GOLD",
      kind: "refined",
      terminalId: 12,
      terminalName: "TDD Area 18",
      priceBuy: 0,
      priceSell: 28000,
      syncedAt: "2026-07-09T10:00:00.000Z",
    });
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("joins ore, body and price data into explorer rows", async () => {
    const rows = await findExplorerRows(db, NO_FILTERS);

    expect(rows).toHaveLength(2);

    const gold = rows.find((row) => row.oreCode === "GOLD");
    expect(gold).toMatchObject({
      oreName: "Gold",
      rarityTier: "rare",
      bodyName: "Monox",
      bodyType: "planet",
      bestRefinedSell: 28000,
    });

    const hada = rows.find((row) => row.oreCode === "HADA");
    expect(hada).toMatchObject({
      oreName: "Hadanite",
      rarityTier: "epic",
      bodyName: "Daymar",
      bestRefinedSell: null,
    });
  });

  it("sorts by probability desc", async () => {
    const rows = await findExplorerRows(db, NO_FILTERS);
    expect(rows.map((row) => row.probabilityPercent)).toEqual([20, 12]);
  });

  it("filters by rarity after the ore join", async () => {
    const rows = await findExplorerRows(db, { ...NO_FILTERS, rarity: "epic" });
    expect(rows).toHaveLength(1);
    expect(rows[0].oreCode).toBe("HADA");
  });

  it("filters by method, system and ore via the query", async () => {
    const ship = await findExplorerRows(db, { ...NO_FILTERS, method: "ship" });
    expect(ship.map((row) => row.oreCode)).toEqual(["GOLD"]);

    const pyro = await findExplorerRows(db, { ...NO_FILTERS, system: "PYRO" });
    expect(pyro.map((row) => row.oreCode)).toEqual(["GOLD"]);

    const hada = await findExplorerRows(db, { ...NO_FILTERS, ore: "HADA" });
    expect(hada.map((row) => row.oreCode)).toEqual(["HADA"]);
  });
});
