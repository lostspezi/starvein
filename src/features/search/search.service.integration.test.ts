import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import {
  upsertCelestialBodies,
  upsertStarSystems,
} from "@/features/locations/locations.repository";
import { upsertOres } from "@/features/ores/ores.repository";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { searchAll } from "./search.service";

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
      href: "/ores#QUAN",
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

  it("respects the limit", async () => {
    const results = await searchAll(db, "a", 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("does not choke on regex special characters", async () => {
    await expect(searchAll(db, "a(")).resolves.toEqual([]);
  });
});
