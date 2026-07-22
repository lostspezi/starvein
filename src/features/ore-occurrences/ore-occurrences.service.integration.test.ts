import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { upsertCelestialBodies } from "@/features/locations/locations.repository";
import { upsertOres } from "@/features/ores/ores.repository";
import { upsertSignatureProfiles } from "@/features/signature-profiles/signature-profiles.repository";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { upsertOreOccurrences } from "./ore-occurrences.repository";
import {
  findOccurrencesByLocationWithOre,
  findOccurrencesByOreWithLocation,
  findOccurrencesByOreWithLocationAndPrices,
  findOccurrencesByOreWithLocationCached,
  findOccurrencesWithInheritance,
} from "./ore-occurrences.service";
import type { OreOccurrence } from "./ore-occurrences.schema";
import type { CelestialBody } from "@/features/locations/locations.schema";

describe("ore occurrences service (joins)", () => {
  let db: Db;

  beforeAll(async () => {
    db = await getDb(uniqueDbName("occurrence-service"));
    await upsertOres(db, [
      {
        code: "HADA",
        name_de: "Hadanite",
        name_en: "Hadanite",
        rarityTier: "epic",
        mineableBy: { ship: false, roc: true, fps: true },
      },
      {
        code: "ALUM",
        name_de: "Aluminium",
        name_en: "Aluminum",
        rarityTier: "common",
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
        oreCode: "ALUM",
        systemCode: "STANTON",
        bodySlug: "daymar",
        method: "ship",
        probabilityPercent: 30,
        patchVersion: "4.7",
        sourceType: "wiki",
        confidenceScore: 0.9,
        lastVerifiedAt: "2026-07-09",
        depositType: "secondary",
        compositionPercent: { min: 2, max: 5 },
        byproductOf: ["QUAN"],
        rockBreakdown: [
          {
            rockLabel: "Quantainium",
            isPrimary: false,
            oreCompositionPercent: { min: 2, max: 5 },
            dominantMaterialName: "Quantainium (Raw)",
            dominantMaterialOreCode: "QUAN",
          },
        ],
      },
    ]);
    // HADA hat ein Profil (fps), ALUM bewusst keines
    await upsertSignatureProfiles(db, [
      {
        oreCode: "HADA",
        method: "fps",
        signatureValue: 3000,
        patchVersion: "4.7",
        sourceType: "curated",
        confidenceScore: 0.6,
      },
    ]);
    // HADA hat nur einen Raw-Preis, ALUM bewusst gar keinen
    await db.collection("priceSnapshots").insertMany([
      {
        oreCode: "HADA",
        kind: "raw",
        terminalId: 1,
        terminalName: "Terminal 1",
        priceBuy: 0,
        priceSell: 8000,
        syncedAt: "2026-07-16T10:00:00.000Z",
      },
      {
        oreCode: "HADA",
        kind: "raw",
        terminalId: 2,
        terminalName: "Terminal 2",
        priceBuy: 0,
        priceSell: 8500,
        syncedAt: "2026-07-16T10:00:00.000Z",
      },
    ]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("joins occurrences of an ore with body name and type", async () => {
    const results = await findOccurrencesByOreWithLocation(db, "HADA");

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      bodySlug: "daymar",
      bodyName: "Daymar",
      bodyType: "moon",
      probabilityPercent: 20,
    });
  });

  it("attaches the method signature to an ore's occurrences (no prices in the wiki read)", async () => {
    const results = await findOccurrencesByOreWithLocation(db, "HADA");

    expect(results[0]).toMatchObject({
      oreCode: "HADA",
      signatureValue: 3000,
      bestRawSell: null,
      bestRefinedSell: null,
    });
  });

  it("carries the deposit fields through both joins", async () => {
    const byOre = await findOccurrencesByOreWithLocation(db, "ALUM");
    expect(byOre[0]).toMatchObject({
      depositType: "secondary",
      compositionPercent: { min: 2, max: 5 },
      byproductOf: ["QUAN"],
      rockBreakdown: [
        { rockLabel: "Quantainium", dominantMaterialOreCode: "QUAN" },
      ],
    });

    const byLocation = await findOccurrencesByLocationWithOre(
      db,
      "STANTON",
      "daymar",
    );
    const alum = byLocation.find((o) => o.oreCode === "ALUM");
    expect(alum).toMatchObject({
      depositType: "secondary",
      byproductOf: ["QUAN"],
    });
    // Row ohne Deposit-Daten bleibt neutral
    const hada = byLocation.find((o) => o.oreCode === "HADA");
    expect(hada).not.toHaveProperty("depositType");
  });

  it("merges the best sell prices via the priced ore read", async () => {
    const results = await findOccurrencesByOreWithLocationAndPrices(db, "HADA");

    expect(results[0]).toMatchObject({
      oreCode: "HADA",
      signatureValue: 3000,
      bestRawSell: 8500,
      bestRefinedSell: null,
    });
  });

  it("cached variant returns the same data (pass-through in tests)", async () => {
    await expect(
      findOccurrencesByOreWithLocationCached(db, "HADA", null),
    ).resolves.toEqual(await findOccurrencesByOreWithLocation(db, "HADA"));
  });

  it("joins occurrences at a location with ore name and rarity", async () => {
    const results = await findOccurrencesByLocationWithOre(
      db,
      "STANTON",
      "daymar",
    );

    expect(results).toHaveLength(2);
    const hada = results.find((o) => o.oreCode === "HADA");
    expect(hada).toMatchObject({
      oreCode: "HADA",
      oreName: "Hadanite",
      rarityTier: "epic",
    });
  });

  it("attaches the signature profile matching ore and method", async () => {
    const results = await findOccurrencesByLocationWithOre(
      db,
      "STANTON",
      "daymar",
    );

    const hada = results.find((o) => o.oreCode === "HADA");
    expect(hada?.signatureValue).toBe(3000);
  });

  it("attaches the best raw and refined sell prices per ore", async () => {
    const results = await findOccurrencesByLocationWithOre(
      db,
      "STANTON",
      "daymar",
    );

    const hada = results.find((o) => o.oreCode === "HADA");
    expect(hada?.bestRawSell).toBe(8500);
    expect(hada?.bestRefinedSell).toBeNull();

    const alum = results.find((o) => o.oreCode === "ALUM");
    expect(alum?.bestRawSell).toBeNull();
    expect(alum?.bestRefinedSell).toBeNull();
  });

  it("leaves the signature undefined when no profile exists", async () => {
    const results = await findOccurrencesByLocationWithOre(
      db,
      "STANTON",
      "daymar",
    );

    const alum = results.find((o) => o.oreCode === "ALUM");
    expect(alum?.signatureValue).toBeUndefined();
    expect(alum?.signatureRange).toBeUndefined();
  });
});

describe("findOccurrencesWithInheritance (outpost roll-up)", () => {
  let db: Db;

  function body(overrides: Partial<CelestialBody>): CelestialBody {
    return {
      slug: "wala",
      systemCode: "STANTON",
      type: "moon",
      name: "Wala",
      parentSlug: "arccorp",
      ...overrides,
    };
  }

  function occurrence(overrides: Partial<OreOccurrence>): OreOccurrence {
    return {
      oreCode: "HADA",
      systemCode: "STANTON",
      bodySlug: "wala",
      method: "fps",
      probabilityPercent: 25,
      patchVersion: "4.8.2",
      sourceType: "wiki",
      confidenceScore: 0.9,
      lastVerifiedAt: "2026-07-16",
      ...overrides,
    };
  }

  beforeAll(async () => {
    db = await getDb(uniqueDbName("occurrence-inherit"));
    await upsertOres(db, [
      {
        code: "HADA",
        name_de: "Hadanite",
        name_en: "Hadanite",
        rarityTier: "epic",
        mineableBy: { ship: false, roc: true, fps: true },
      },
      {
        code: "QUAN",
        name_de: "Quantainium",
        name_en: "Quantainium",
        rarityTier: "legendary",
        mineableBy: { ship: true, roc: false, fps: false },
      },
    ]);
    await upsertCelestialBodies(db, [
      body({
        slug: "arccorp",
        type: "planet",
        name: "ArcCorp",
        parentSlug: null,
      }),
      body({}),
      body({
        slug: "arccorp-mining-area-061",
        type: "outpost",
        name: "ArcCorp Mining Area 061",
        parentSlug: "wala",
      }),
      // Outpost, dessen Mond selbst leer ist -> erbt vom Planeten
      body({ slug: "empty-moon", name: "Empty Moon", parentSlug: "arccorp" }),
      body({
        slug: "deep-outpost",
        type: "outpost",
        name: "Deep Outpost",
        parentSlug: "empty-moon",
      }),
    ]);
    await upsertOreOccurrences(db, [
      occurrence({}),
      occurrence({ oreCode: "QUAN", method: "ship", probabilityPercent: 6 }),
      occurrence({
        bodySlug: "arccorp",
        oreCode: "QUAN",
        method: "ship",
        probabilityPercent: 3,
      }),
    ]);
  });

  it("returns own occurrences without inheritance marker", async () => {
    const wala = body({});
    const result = await findOccurrencesWithInheritance(db, "STANTON", wala);

    expect(result.inheritedFrom).toBeNull();
    expect(result.occurrences).toHaveLength(2);
  });

  it("inherits the parent moon's occurrences for an outpost", async () => {
    const outpost = body({
      slug: "arccorp-mining-area-061",
      type: "outpost",
      name: "ArcCorp Mining Area 061",
      parentSlug: "wala",
    });

    const result = await findOccurrencesWithInheritance(db, "STANTON", outpost);

    expect(result.inheritedFrom?.slug).toBe("wala");
    expect(result.occurrences.map((o) => o.oreCode).sort()).toEqual([
      "HADA",
      "QUAN",
    ]);
  });

  it("walks up multiple levels until occurrences are found", async () => {
    const outpost = body({
      slug: "deep-outpost",
      type: "outpost",
      name: "Deep Outpost",
      parentSlug: "empty-moon",
    });

    const result = await findOccurrencesWithInheritance(db, "STANTON", outpost);

    expect(result.inheritedFrom?.slug).toBe("arccorp");
    expect(result.occurrences.map((o) => o.oreCode)).toEqual(["QUAN"]);
  });

  it("passes the method filter through to inherited occurrences", async () => {
    const outpost = body({
      slug: "arccorp-mining-area-061",
      type: "outpost",
      name: "ArcCorp Mining Area 061",
      parentSlug: "wala",
    });

    const result = await findOccurrencesWithInheritance(
      db,
      "STANTON",
      outpost,
      "fps",
    );

    expect(result.inheritedFrom?.slug).toBe("wala");
    expect(result.occurrences.map((o) => o.oreCode)).toEqual(["HADA"]);
  });

  it("returns empty without marker when nothing is found up the chain", async () => {
    const planet = body({
      slug: "arccorp",
      type: "planet",
      name: "ArcCorp",
      parentSlug: null,
    });

    const result = await findOccurrencesWithInheritance(
      db,
      "STANTON",
      planet,
      "roc",
    );

    expect(result.inheritedFrom).toBeNull();
    expect(result.occurrences).toHaveLength(0);
  });

  afterAll(async () => {
    await closeMongo();
  });
});
