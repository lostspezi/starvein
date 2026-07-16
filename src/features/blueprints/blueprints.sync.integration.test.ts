import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { Db } from "mongodb";
import { upsertOres } from "@/features/ores/ores.repository";
import type { Ore } from "@/features/ores/ores.schema";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  GAME_VERSION,
  SCWIKI_TEST_BASE_URL,
  scWikiServer,
} from "@/test/scwiki-server";
import { findAllBlueprints, upsertBlueprints } from "./blueprints.repository";
import { syncWikiBlueprints } from "./blueprints.sync";
import { findAllMaterials, upsertMaterials } from "./materials.repository";

function ore(code: string, name: string): Ore {
  return {
    code,
    name_de: name,
    name_en: name,
    rarityTier: "common",
    mineableBy: { ship: true, roc: false, fps: false },
  };
}

describe("syncWikiBlueprints", () => {
  let db: Db;

  beforeAll(() => {
    process.env.SCWIKI_API_BASE_URL = SCWIKI_TEST_BASE_URL;
    scWikiServer.listen({ onUnhandledRequest: "error" });
  });

  afterEach(() => scWikiServer.resetHandlers());

  afterAll(async () => {
    scWikiServer.close();
    delete process.env.SCWIKI_API_BASE_URL;
    await closeMongo();
  });

  beforeEach(async () => {
    db = await getDb(uniqueDbName("wiki-sync"));
    await upsertOres(db, [ore("AGRI", "Agricium"), ore("HADA", "Hadanite")]);
  });

  it("imports blueprints across all pages", async () => {
    const summary = await syncWikiBlueprints(db);

    expect(summary.blueprints).toBe(2);
    expect((await findAllBlueprints(db)).map((b) => b.key).sort()).toEqual([
      "BP_CRAFT_AMRS_LaserCannon_S1",
      "BP_CRAFT_Char_Armor_Helmet_01",
    ]);
  });

  it("reports the game version from the wiki", async () => {
    await expect(syncWikiBlueprints(db)).resolves.toMatchObject({
      gameVersion: GAME_VERSION,
    });
  });

  it("skips blueprints without ingredients", async () => {
    const summary = await syncWikiBlueprints(db);

    expect(summary.skippedBlueprints).toBe(1);
    expect(
      (await findAllBlueprints(db)).some((b) => b.key === "BP_CRAFT_EMPTY"),
    ).toBe(false);
  });

  it("derives the material catalog from the ingredients", async () => {
    const summary = await syncWikiBlueprints(db);

    expect(summary.materials).toBe(3);
    expect((await findAllMaterials(db)).map((m) => m.code)).toEqual([
      "AGRI",
      "HADA",
      "PRESSURIZED_ICE",
    ]);
  });

  it("links ore-backed materials and leaves non-ore ones unlinked", async () => {
    await syncWikiBlueprints(db);

    const materials = await findAllMaterials(db);
    expect(materials.find((m) => m.code === "AGRI")?.oreCode).toBe("AGRI");
    expect(
      materials.find((m) => m.code === "PRESSURIZED_ICE")?.oreCode,
    ).toBeUndefined();
  });

  it("keeps SCU and item units apart", async () => {
    await syncWikiBlueprints(db);

    const laser = (await findAllBlueprints(db)).find(
      (b) => b.key === "BP_CRAFT_AMRS_LaserCannon_S1",
    );

    expect(laser?.ingredients).toEqual([
      { materialCode: "AGRI", kind: "resource", quantity: 0.36 },
      { materialCode: "HADA", kind: "item", quantity: 7 },
    ]);
  });

  it("maps the wiki output type to a category", async () => {
    await syncWikiBlueprints(db);

    const blueprints = await findAllBlueprints(db);
    expect(
      blueprints.find((b) => b.key === "BP_CRAFT_Char_Armor_Helmet_01")
        ?.category,
    ).toBe("armor");
    expect(
      blueprints.find((b) => b.key === "BP_CRAFT_AMRS_LaserCannon_S1")
        ?.category,
    ).toBe("ship-weapon");
  });

  it("is idempotent across repeated syncs", async () => {
    await syncWikiBlueprints(db);
    const summary = await syncWikiBlueprints(db);

    expect(summary.blueprints).toBe(2);
    expect(await findAllBlueprints(db)).toHaveLength(2);
    expect(await findAllMaterials(db)).toHaveLength(3);
  });

  /** Ein Patch kann Blueprints entfernen — Karteileichen müssen verschwinden. */
  it("prunes blueprints and materials the wiki no longer provides", async () => {
    await upsertBlueprints(db, [
      {
        key: "BP_CRAFT_GONE",
        slug: "bp_craft_gone",
        wikiUuid: "944a73bb-974c-4e4c-ab0f-6f9cd062c5a5",
        outputName: "Removed Thing",
        outputType: "Misc",
        category: "other",
        craftTimeSeconds: 10,
        isAvailableByDefault: false,
        ingredients: [{ materialCode: "AGRI", kind: "resource", quantity: 1 }],
        gameVersion: "4.7",
        sourceType: "wiki",
        syncedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    await upsertMaterials(db, [
      {
        code: "OLDMAT",
        name: "Old Material",
        kind: "resource",
        wikiUuid: "944a73bb-974c-4e4c-ab0f-6f9cd062c5a5",
        gameVersion: "4.7",
        sourceType: "wiki",
        syncedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const summary = await syncWikiBlueprints(db);

    expect(summary.prunedBlueprints).toBe(1);
    expect(summary.prunedMaterials).toBe(1);
    expect(
      (await findAllBlueprints(db)).some((b) => b.key === "BP_CRAFT_GONE"),
    ).toBe(false);
    expect((await findAllMaterials(db)).some((m) => m.code === "OLDMAT")).toBe(
      false,
    );
  });

  it("records the sync in syncMeta", async () => {
    const summary = await syncWikiBlueprints(db);

    const meta = await db.collection("syncMeta").findOne({ key: "scwiki" });
    expect(meta).toMatchObject({
      key: "scwiki",
      syncedAt: summary.syncedAt,
      gameVersion: GAME_VERSION,
    });
  });
});
