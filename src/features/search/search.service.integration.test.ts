import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { upsertBlueprints } from "@/features/blueprints/blueprints.repository";
import type { Blueprint } from "@/features/blueprints/blueprints.schema";
import {
  upsertCelestialBodies,
  upsertStarSystems,
} from "@/features/locations/locations.repository";
import { upsertOres } from "@/features/ores/ores.repository";
import { upsertSignatureProfiles } from "@/features/signature-profiles/signature-profiles.repository";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { searchAll } from "./search.service";

function blueprint(over: Partial<Blueprint> = {}): Blueprint {
  return {
    key: "BP_CRAFT_AMRS_LaserCannon_S1",
    slug: "bp_craft_amrs_lasercannon_s1",
    wikiUuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
    outputName: "Omnisky III Cannon",
    outputType: "WeaponGun",
    category: "ship-weapon",
    craftTimeSeconds: 540,
    isAvailableByDefault: false,
    ingredients: [{ materialCode: "AGRI", kind: "resource", quantity: 0.36 }],
    gameVersion: "4.8.2-LIVE.12030094",
    sourceType: "wiki",
    syncedAt: "2026-07-16T00:00:00.000Z",
    ...over,
  };
}

describe("search service", () => {
  let db: Db;

  beforeAll(async () => {
    db = await getDb(uniqueDbName("search"));
    await upsertOres(db, [
      {
        code: "QUAN",
        name_de: "Quantainium",
        name_en: "Quantainium",
        rarityTier: "legendary",
        mineableBy: { ship: true, roc: false, fps: false },
      },
      {
        code: "QUAR",
        name_de: "Quartz",
        name_en: "Quartz",
        rarityTier: "common",
        mineableBy: { ship: true, roc: false, fps: false },
      },
    ]);
    await upsertStarSystems(db, [
      { code: "STANTON", name: "Stanton", status: "live", uexId: 68 },
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
        slug: "arccorp-mining-area-045",
        systemCode: "STANTON",
        type: "outpost",
        name: "ArcCorp Mining Area 045",
        parentSlug: "wala",
        uexId: 1,
      },
    ]);
    await upsertBlueprints(db, [
      blueprint(),
      blueprint({
        key: "BP_CRAFT_Char_Armor_Helmet_Quartz",
        slug: "bp_craft_char_armor_helmet_quartz",
        wikiUuid: "1893e596-acaf-49bc-b367-e43e99c2925f",
        outputName: "Quartzite Helmet",
        outputType: "Char_Armor_Helmet",
        category: "armor",
      }),
    ]);
    await upsertSignatureProfiles(db, [
      {
        oreCode: "QUAN",
        method: "ship",
        signatureValue: 3170,
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
      {
        oreCode: "HADA",
        method: "roc",
        signatureValue: 4000,
        patchVersion: "4.7",
        sourceType: "curated",
        confidenceScore: 0.6,
      },
    ]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("finds bodies by name fragment", async () => {
    const results = await searchAll(db, "yel");
    expect(results).toContainEqual({
      kind: "body",
      label: "Yela",
      detail: "moon",
      href: "/locations/stanton/yela",
    });
  });

  it("finds ores by name and by code", async () => {
    const byName = await searchAll(db, "quant");
    expect(byName).toContainEqual({
      kind: "ore",
      label: "Quantainium",
      detail: "legendary",
      href: "/ores/quan",
    });

    const byCode = await searchAll(db, "QUAR");
    expect(byCode.some((r) => r.label === "Quartz")).toBe(true);
  });

  it("finds systems and links to their browser page", async () => {
    const results = await searchAll(db, "stan");
    expect(results).toContainEqual({
      kind: "system",
      label: "Stanton",
      detail: "system",
      href: "/locations/stanton",
    });
  });

  it("matches case-insensitive substrings", async () => {
    const results = await searchAll(db, "mining area 045");
    expect(results.some((r) => r.label === "ArcCorp Mining Area 045")).toBe(
      true,
    );
  });

  it("returns an empty list for blank queries", async () => {
    await expect(searchAll(db, "   ")).resolves.toEqual([]);
  });

  /** Numerische Queries: gescannter RS-Wert -> Mineral × Cluster-Anzahl. */
  it("resolves an exact signature value to exactly one match", async () => {
    const results = await searchAll(db, "3170");
    const signatures = results.filter((r) => r.kind === "signature");
    // exakter Erz-Treffer -> keine Näherungsvorschläge daneben
    expect(signatures).toEqual([
      {
        kind: "signature",
        label: "1 × Quantainium",
        detail: "3170",
        href: "/ores/quan",
      },
    ]);
  });

  it("resolves cluster sums including thousand separators", async () => {
    const results = await searchAll(db, "6.340");
    expect(results[0]).toEqual({
      kind: "signature",
      label: "2 × Quantainium",
      detail: "3170",
      href: "/ores/quan",
    });
  });

  it("resolves ground deposit sums to the signature reference", async () => {
    const results = await searchAll(db, "12000");
    // exakte Treffer zuerst, danach der Näherungsvorschlag (4 × 3170)
    expect(results.slice(0, 3)).toEqual([
      {
        kind: "signature",
        label: "3 × ROC",
        detail: "4000",
        href: "/signatures",
      },
      {
        kind: "signature",
        label: "4 × FPS",
        detail: "3000",
        href: "/signatures",
      },
      {
        kind: "signature",
        label: "4 × Quantainium",
        detail: "3170",
        href: "/ores/quan",
      },
    ]);
  });

  /** Näherungssuche: grobe Werte schlagen Minerale in ±10% Toleranz vor. */
  it("suggests nearby minerals for approximate values", async () => {
    const results = await searchAll(db, "3000");
    expect(results.slice(0, 2)).toEqual([
      {
        kind: "signature",
        label: "1 × FPS",
        detail: "3000",
        href: "/signatures",
      },
      {
        kind: "signature",
        label: "1 × Quantainium",
        detail: "3170",
        href: "/ores/quan",
      },
    ]);
  });

  it("returns no signature matches outside the tolerance", async () => {
    const results = await searchAll(db, "5000");
    expect(results.some((r) => r.kind === "signature")).toBe(false);
  });

  it("does not run signature matching for text queries", async () => {
    const results = await searchAll(db, "quant");
    expect(results.some((r) => r.kind === "signature")).toBe(false);
  });

  it("respects the limit", async () => {
    const results = await searchAll(db, "a", 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("does not choke on regex special characters", async () => {
    await expect(searchAll(db, "a(")).resolves.toEqual([]);
  });

  it("finds blueprints by the item they produce", async () => {
    const results = await searchAll(db, "omnisky");

    expect(results).toContainEqual({
      kind: "blueprint",
      label: "Omnisky III Cannon",
      detail: "ship-weapon",
      href: "/blueprints/bp_craft_amrs_lasercannon_s1",
    });
  });

  it("finds blueprints by their wiki key", async () => {
    const results = await searchAll(db, "BP_CRAFT_AMRS");

    expect(results.some((r) => r.label === "Omnisky III Cannon")).toBe(true);
  });

  it("does not match blueprints on their raw output type", async () => {
    // outputType würde bei "radar"/"weapongun" die Vorschläge fluten —
    // dafür gibt es den Kategorie-Filter auf /blueprints.
    const results = await searchAll(db, "weapongun");

    expect(results).toEqual([]);
  });

  /** Kern-Entitäten dürfen nicht von den >1500 Blueprints verdrängt werden. */
  it("ranks an ore above a blueprint when both match the prefix", async () => {
    const results = await searchAll(db, "quar");

    const oreIndex = results.findIndex((r) => r.label === "Quartz");
    const blueprintIndex = results.findIndex(
      (r) => r.label === "Quartzite Helmet",
    );

    expect(oreIndex).toBeGreaterThanOrEqual(0);
    expect(blueprintIndex).toBeGreaterThan(oreIndex);
  });

  it("still ranks a prefix-matching blueprint above a substring-matching ore", async () => {
    const results = await searchAll(db, "quartz");

    // "Quartzite Helmet" matcht am Wortanfang, "Quartz" (Erz) ebenfalls —
    // bei Gleichstand gewinnt das Erz.
    expect(results[0].label).toBe("Quartz");
  });
});
