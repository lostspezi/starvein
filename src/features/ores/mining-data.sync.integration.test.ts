import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { syncWikiLocations } from "@/features/locations/locations.sync";
import { upsertStarSystems } from "@/features/locations/locations.repository";
import { findOccurrencesByLocation } from "@/features/ore-occurrences/ore-occurrences.repository";
import { upsertOreOccurrences } from "@/features/ore-occurrences/ore-occurrences.repository";
import {
  findSignatureProfilesByOre,
  upsertSignatureProfiles,
} from "@/features/signature-profiles/signature-profiles.repository";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { SCWIKI_TEST_BASE_URL, scWikiServer } from "@/test/scwiki-server";
import { findAllOres, findOreByCode } from "./ores.repository";
import { syncWikiMiningData } from "./mining-data.sync";

describe("syncWikiMiningData", () => {
  let db: Db;

  beforeAll(() => {
    process.env.SCWIKI_API_BASE_URL = SCWIKI_TEST_BASE_URL;
    scWikiServer.listen({ onUnhandledRequest: "error" });
  });

  afterAll(async () => {
    scWikiServer.close();
    delete process.env.SCWIKI_API_BASE_URL;
    await closeMongo();
  });

  beforeEach(async () => {
    db = await getDb(uniqueDbName("mining-sync"));
    await upsertStarSystems(db, [
      { code: "STANTON", name: "Stanton", status: "live", uexId: 68 },
    ]);
    // Kuratierte Signatur-Fallbacks (Diftic): AGRI wird vom Wiki überschrieben,
    // QUAN (Wiki-Signatur null) muss unangetastet bleiben.
    await upsertSignatureProfiles(db, [
      {
        oreCode: "QUAN",
        method: "ship",
        signatureValue: 3170,
        dominantCompositionRange: { min: 40, max: 60 },
        patchVersion: "4.7",
        sourceType: "curated",
        confidenceScore: 0.6,
      },
      {
        oreCode: "AGRI",
        method: "ship",
        signatureValue: 1850,
        dominantCompositionRange: { min: 45, max: 75 },
        patchVersion: "4.7",
        sourceType: "curated",
        confidenceScore: 0.6,
      },
    ]);
    await syncWikiLocations(db);
  });

  it("imports the ore catalog with wiki tiers and rarity fallbacks", async () => {
    const summary = await syncWikiMiningData(db);

    expect(summary.ores).toBe(4);
    expect((await findAllOres(db)).map((o) => o.code).sort()).toEqual([
      "AGRI",
      "CARI",
      "HADA",
      "QUAN",
    ]);

    // Wiki-Tier gewinnt, physikalische Werte kommen mit
    expect(await findOreByCode(db, "AGRI")).toMatchObject({
      rarityTier: "uncommon",
      mineableBy: { ship: true, roc: false, fps: false },
      instability: 350,
      resistance: 0.5,
    });
    // Wiki-Tier null -> kuratierter Fallback (epic)
    expect((await findOreByCode(db, "HADA"))?.rarityTier).toBe("epic");
    // Keine Wiki-Booleans -> mineableByFallback
    expect((await findOreByCode(db, "CARI"))?.mineableBy).toEqual({
      ship: false,
      roc: true,
      fps: true,
    });
  });

  it("reports unmapped wiki mineables instead of inventing codes", async () => {
    const summary = await syncWikiMiningData(db);
    // Nur echte Minerale (kind=mineable) — Harvestables wie SunsetBerry
    // sind keine Mining-Referenz-Kandidaten und erzeugen kein Log-Rauschen.
    expect(summary.skippedUnmappedOres).toEqual(["Raw_Newmineral"]);
  });

  /**
   * Das signature-Feld der Wiki-API ist NICHT der In-Game-Scanner-RS-Wert
   * (community-verifiziert via sc-mining-hud + Rock Syndicate, 2026-07-16) —
   * der Sync darf die kuratierte Signatur-Referenz deshalb nie anfassen.
   */
  it("leaves the curated signature profiles completely untouched", async () => {
    await syncWikiMiningData(db);

    const quan = await findSignatureProfilesByOre(db, "QUAN");
    expect(quan).toHaveLength(1);
    expect(quan[0]).toMatchObject({
      signatureValue: 3170,
      sourceType: "curated",
      patchVersion: "4.7",
    });

    const agri = await findSignatureProfilesByOre(db, "AGRI");
    expect(agri).toHaveLength(1);
    expect(agri[0]).toMatchObject({
      signatureValue: 1850,
      sourceType: "curated",
      patchVersion: "4.7",
      dominantCompositionRange: { min: 45, max: 75 },
    });

    // Auch keine neuen Profile aus Wiki-Werten anlegen
    expect(await findSignatureProfilesByOre(db, "HADA")).toHaveLength(0);
  });

  it("imports occurrences with both probabilities and game-data provenance", async () => {
    const summary = await syncWikiMiningData(db);

    expect(summary.occurrences).toBe(6);
    // Übersprungen: Lorville (weggefilterter Typ) + Halo Band Alpha (ohne
    // resourceLocationUuids nicht gesynct — der Rescue-Pfad läuft nur im
    // vollen runFullWikiSync)
    expect(summary.skippedOccurrences).toBe(2);

    const wala = await findOccurrencesByLocation(db, "STANTON", "wala");
    const agri = wala.find((o) => o.oreCode === "AGRI");
    expect(agri).toMatchObject({
      method: "ship",
      probabilityPercent: 20,
      relativeProbabilityPercent: 10,
      sourceType: "wiki",
      confidenceScore: 0.9,
      patchVersion: "4.8.2",
    });

    // Lagrange-Cluster bekommt eigene Occurrences
    const hurL1 = await findOccurrencesByLocation(db, "STANTON", "hur-l1");
    expect(hurL1.map((o) => o.oreCode)).toEqual(["AGRI"]);
  });

  it("prunes occurrences the wiki no longer provides", async () => {
    await upsertOreOccurrences(db, [
      {
        oreCode: "GOLD",
        systemCode: "STANTON",
        bodySlug: "wala",
        method: "ship",
        probabilityPercent: 42,
        patchVersion: "4.7",
        sourceType: "curated",
        confidenceScore: 0.3,
        lastVerifiedAt: "2026-07-09",
      },
    ]);

    const summary = await syncWikiMiningData(db);

    expect(summary.prunedOccurrences).toBe(1);
    const wala = await findOccurrencesByLocation(db, "STANTON", "wala");
    expect(wala.some((o) => o.oreCode === "GOLD")).toBe(false);
  });

  it("is idempotent across repeated syncs", async () => {
    await syncWikiMiningData(db);
    const summary = await syncWikiMiningData(db);

    expect(summary.ores).toBe(4);
    expect(summary.occurrences).toBe(6);
    expect(await findAllOres(db)).toHaveLength(4);
  });
});
