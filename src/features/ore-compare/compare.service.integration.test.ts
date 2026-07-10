import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { upsertCelestialBodies } from "@/features/locations/locations.repository";
import { upsertOreOccurrences } from "@/features/ore-occurrences/ore-occurrences.repository";
import { upsertOres } from "@/features/ores/ores.repository";
import { upsertSignatureProfiles } from "@/features/signature-profiles/signature-profiles.repository";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { getOreComparison } from "./compare.service";

describe("ore comparison service", () => {
  let db: Db;

  beforeAll(async () => {
    db = await getDb(uniqueDbName("compare"));

    await upsertOres(db, [
      {
        code: "QUAN",
        name_de: "Quantainium",
        name_en: "Quantainium",
        rarityTier: "legendary",
        mineableBy: { ship: true, roc: false, fps: false },
      },
      {
        code: "HADA",
        name_de: "Hadanite",
        name_en: "Hadanite",
        rarityTier: "epic",
        mineableBy: { ship: false, roc: true, fps: true },
      },
    ]);
    await upsertSignatureProfiles(db, [
      {
        oreCode: "QUAN",
        method: "ship",
        signatureValue: 3170,
        dominantCompositionRange: { min: 40, max: 80 },
        notes: "+ Beryl (10-20%)",
        patchVersion: "4.7",
        sourceType: "curated",
        confidenceScore: 0.6,
      },
      {
        oreCode: "HADA",
        method: "fps",
        signatureValue: 3000,
        patchVersion: "4.7",
        sourceType: "curated",
        confidenceScore: 0.6,
      },
    ]);
    await upsertCelestialBodies(db, [
      {
        slug: "yela",
        systemCode: "STANTON",
        type: "moon",
        name: "Yela",
        parentSlug: "crusader",
        uexId: 75,
      },
      {
        slug: "daymar",
        systemCode: "STANTON",
        type: "moon",
        name: "Daymar",
        parentSlug: "crusader",
        uexId: 25,
      },
      {
        slug: "lyria",
        systemCode: "STANTON",
        type: "moon",
        name: "Lyria",
        parentSlug: "arccorp",
        uexId: 50,
      },
      {
        slug: "cellin",
        systemCode: "STANTON",
        type: "moon",
        name: "Cellin",
        parentSlug: "crusader",
        uexId: 18,
      },
    ]);
    await upsertOreOccurrences(
      db,
      [
        { bodySlug: "yela", probabilityPercent: 15 },
        { bodySlug: "daymar", probabilityPercent: 20 },
        { bodySlug: "lyria", probabilityPercent: 25 },
        { bodySlug: "cellin", probabilityPercent: 10 },
      ].map((partial) => ({
        oreCode: "HADA",
        systemCode: "STANTON",
        method: "fps" as const,
        patchVersion: "4.7",
        sourceType: "curated" as const,
        confidenceScore: 0.3,
        lastVerifiedAt: "2026-07-09",
        ...partial,
      })),
    );
    await db.collection("priceSnapshots").insertMany([
      {
        oreCode: "QUAN",
        kind: "refined",
        terminalId: 1,
        terminalName: "TDD Orison",
        priceBuy: 0,
        priceSell: 150000,
        syncedAt: "2026-07-09",
      },
      {
        oreCode: "QUAN",
        kind: "raw",
        terminalId: 2,
        terminalName: "Refinery Deck",
        priceBuy: 0,
        priceSell: 88000,
        syncedAt: "2026-07-09",
      },
    ]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("builds one comparison column per requested ore", async () => {
    const columns = await getOreComparison(db, ["QUAN", "HADA"]);

    expect(columns).toHaveLength(2);
    expect(columns[0].ore.code).toBe("QUAN");
    expect(columns[1].ore.code).toBe("HADA");
  });

  it("includes signature, prices and top locations", async () => {
    const [quan, hada] = await getOreComparison(db, ["QUAN", "HADA"]);

    expect(quan.shipSignature?.signatureValue).toBe(3170);
    expect(quan.bestRefinedSell).toBe(150000);
    expect(quan.bestRawSell).toBe(88000);
    expect(quan.topLocations).toEqual([]);

    expect(hada.shipSignature).toBeNull();
    expect(hada.groundSignatures).toHaveLength(1);
    expect(hada.bestRefinedSell).toBeNull();
    // Top 3 nach Wahrscheinlichkeit, absteigend
    expect(hada.topLocations.map((l) => l.bodyName)).toEqual([
      "Lyria",
      "Daymar",
      "Yela",
    ]);
  });

  it("ignores unknown ore codes", async () => {
    const columns = await getOreComparison(db, ["QUAN", "NOPE"]);
    expect(columns).toHaveLength(1);
  });
});
