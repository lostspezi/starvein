import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { upsertCelestialBodies } from "@/features/locations/locations.repository";
import { upsertOres } from "@/features/ores/ores.repository";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { upsertOreOccurrences } from "./ore-occurrences.repository";
import {
  findOccurrencesByLocationWithOre,
  findOccurrencesByOreWithLocation,
} from "./ore-occurrences.service";

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

  it("joins occurrences at a location with ore name and rarity", async () => {
    const results = await findOccurrencesByLocationWithOre(
      db,
      "STANTON",
      "daymar",
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      oreCode: "HADA",
      oreName: "Hadanite",
      rarityTier: "epic",
    });
  });
});
