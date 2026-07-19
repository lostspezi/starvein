import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { upsertCelestialBodies } from "@/features/locations/locations.repository";
import { upsertOreOccurrences } from "@/features/ore-occurrences/ore-occurrences.repository";
import { upsertOres } from "@/features/ores/ores.repository";
import { upsertSignatureProfiles } from "@/features/signature-profiles/signature-profiles.repository";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  EXPLORER_ROW_LIMIT,
  findExplorerRows,
  findTopOreRows,
} from "./explorer.service";

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
    await db.collection("priceSnapshots").insertMany([
      {
        oreCode: "GOLD",
        kind: "refined",
        terminalId: 12,
        terminalName: "TDD Area 18",
        priceBuy: 0,
        priceSell: 28000,
        syncedAt: "2026-07-09T10:00:00.000Z",
      },
      {
        oreCode: "GOLD",
        kind: "raw",
        terminalId: 12,
        terminalName: "TDD Area 18",
        priceBuy: 0,
        priceSell: 19000,
        syncedAt: "2026-07-09T10:00:00.000Z",
      },
    ]);
    await upsertSignatureProfiles(db, [
      {
        oreCode: "GOLD",
        method: "ship",
        signatureValue: 3585,
        dominantCompositionRange: { min: 40, max: 80 },
        patchVersion: "4.7",
        sourceType: "curated",
        confidenceScore: 0.6,
      },
    ]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("joins ore, body and price data into explorer rows", async () => {
    const { rows } = await findExplorerRows(db, NO_FILTERS);

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

  it("attaches raw sell price and the method's signature to each row", async () => {
    const { rows } = await findExplorerRows(db, NO_FILTERS);

    const gold = rows.find((row) => row.oreCode === "GOLD");
    expect(gold).toMatchObject({
      bestRawSell: 19000,
      signatureValue: 3585,
    });

    // HADA has no signature profile and no price snapshot
    const hada = rows.find((row) => row.oreCode === "HADA");
    expect(hada?.bestRawSell).toBeNull();
    expect(hada?.signatureValue).toBeUndefined();
  });

  it("sorts by probability desc", async () => {
    const { rows } = await findExplorerRows(db, NO_FILTERS);
    expect(rows.map((row) => row.probabilityPercent)).toEqual([20, 12]);
  });

  it("filters by rarity after the ore join", async () => {
    const { rows } = await findExplorerRows(db, {
      ...NO_FILTERS,
      rarity: "epic",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].oreCode).toBe("HADA");
  });

  it("filters by method, system and ore via the query", async () => {
    const { rows: ship } = await findExplorerRows(db, {
      ...NO_FILTERS,
      method: "ship",
    });
    expect(ship.map((row) => row.oreCode)).toEqual(["GOLD"]);

    const { rows: pyro } = await findExplorerRows(db, {
      ...NO_FILTERS,
      system: "PYRO",
    });
    expect(pyro.map((row) => row.oreCode)).toEqual(["GOLD"]);

    const { rows: hada } = await findExplorerRows(db, {
      ...NO_FILTERS,
      ore: "HADA",
    });
    expect(hada.map((row) => row.oreCode)).toEqual(["HADA"]);
  });

  /**
   * Der Wiki-Sync liefert tausende Vorkommen — die Startseite rendert nur
   * die Top-Rows, sonst wird das SSR-HTML mehrere MB groß (Regression:
   * e2e-Timeouts auf "/").
   */
  it("caps the rendered rows and reports the total", async () => {
    const bulk = Array.from({ length: EXPLORER_ROW_LIMIT + 25 }, (_, i) => ({
      oreCode: "GOLD",
      systemCode: "STANTON",
      bodySlug: `bulk-rock-${i}`,
      method: "ship" as const,
      probabilityPercent: 1,
      patchVersion: "4.8.2",
      sourceType: "wiki" as const,
      confidenceScore: 0.9,
      lastVerifiedAt: "2026-07-16",
    }));
    await upsertOreOccurrences(db, bulk);

    const result = await findExplorerRows(db, NO_FILTERS);

    expect(result.rows).toHaveLength(EXPLORER_ROW_LIMIT);
    expect(result.total).toBe(EXPLORER_ROW_LIMIT + 25 + 2);
    // Cap schneidet hinten ab: die wahrscheinlichsten Vorkommen bleiben vorn
    expect(result.rows[0].probabilityPercent).toBe(20);
  });
});

describe("findTopOreRows", () => {
  let db: Db;

  beforeAll(async () => {
    db = await getDb(uniqueDbName("explorer-top"));

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
        oreCode: "HADA",
        systemCode: "PYRO",
        bodySlug: "monox",
        method: "fps",
        probabilityPercent: 35,
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
  });

  it("keeps only the best occurrence per ore", async () => {
    const { rows, total } = await findTopOreRows(db, NO_FILTERS);

    expect(rows.map((row) => [row.oreCode, row.probabilityPercent])).toEqual([
      ["HADA", 35],
      ["GOLD", 12],
    ]);
    // total zählt alle Vorkommen (fürs "Alle X ansehen"-Link), nicht die Dedupe-Rows
    expect(total).toBe(3);
  });

  it("caps the deduplicated rows at the limit", async () => {
    const { rows } = await findTopOreRows(db, NO_FILTERS, 1);
    expect(rows.map((row) => row.oreCode)).toEqual(["HADA"]);
  });

  it("applies the explorer filters before deduplicating", async () => {
    const { rows } = await findTopOreRows(db, {
      ...NO_FILTERS,
      system: "STANTON",
    });
    expect(rows.map((row) => [row.oreCode, row.probabilityPercent])).toEqual([
      ["HADA", 20],
    ]);
  });
});
