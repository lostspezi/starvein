import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { upsertMiningVehicles } from "@/features/loadouts/equipment.repository";
import { upsertOres } from "@/features/ores/ores.repository";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { UEX_TEST_BASE_URL, uexServer } from "@/test/uex-server";
import { findRefineryYieldsByOre, getOrePriceSummary } from "./price-summary";
import { syncUex } from "./sync.service";

describe("UEX sync service", () => {
  let db: Db;

  beforeAll(async () => {
    uexServer.listen({ onUnhandledRequest: "error" });
    process.env.UEX_API_BASE_URL = UEX_TEST_BASE_URL;

    db = await getDb(uniqueDbName("uex-sync"));
    await upsertOres(db, [
      {
        code: "GOLD",
        name_de: "Gold",
        name_en: "Gold",
        rarityTier: "rare",
        mineableBy: { ship: true, roc: false, fps: false },
      },
      {
        code: "IRON",
        name_de: "Iron",
        name_en: "Iron",
        rarityTier: "common",
        mineableBy: { ship: true, roc: false, fps: false },
      },
    ]);
    await upsertMiningVehicles(db, [
      {
        code: "prospector",
        name: "Prospector",
        manufacturer: "MISC",
        method: "ship",
        hardpoints: [{ size: 1 }],
        gadgetCapable: true,
        stockLaserCode: "arbor-mh1",
        patchVersion: "4.7",
      },
    ]);
  });

  afterEach(() => {
    uexServer.resetHandlers();
  });

  afterAll(async () => {
    uexServer.close();
    await closeMongo();
  });

  it("syncs mapped prices, yields and methods into mongo", async () => {
    const summary = await syncUex(db);

    expect(summary.prices).toBe(2); // GOLD refined + GOLD raw, WiDoW gefiltert
    expect(summary.yields).toBe(1); // IRONO -> IRON
    expect(summary.methods).toBe(1);
    // prospector: 2 Käufe (player-owned + Nullpreis gefiltert) + 2 Mieten
    expect(summary.vehiclePrices).toBe(4);
    expect(await db.collection("vehiclePrices").countDocuments()).toBe(4);

    const snapshots = await db
      .collection("priceSnapshots")
      .find({}, { projection: { _id: 0 } })
      .toArray();
    expect(snapshots).toHaveLength(2);
    expect(snapshots).toContainEqual(
      expect.objectContaining({
        oreCode: "GOLD",
        kind: "refined",
        terminalId: 12,
        priceSell: 28000,
      }),
    );

    const yields = await db
      .collection("refineryYields")
      .find({}, { projection: { _id: 0 } })
      .toArray();
    expect(yields).toHaveLength(1);
    expect(yields[0]).toMatchObject({
      oreCode: "IRON",
      terminalId: 755,
      bonusPercent: -5,
    });
  });

  it("is idempotent on re-run", async () => {
    await syncUex(db);
    await syncUex(db);

    expect(await db.collection("priceSnapshots").countDocuments()).toBe(2);
    expect(await db.collection("refineryYields").countDocuments()).toBe(1);
    expect(await db.collection("refineryMethods").countDocuments()).toBe(1);
  });

  it("records the sync timestamp", async () => {
    await syncUex(db);
    const meta = await db.collection("syncMeta").findOne({ key: "uex" });
    expect(typeof meta?.syncedAt).toBe("string");
  });

  it("provides a price summary per ore from mongo", async () => {
    await syncUex(db);

    const summary = await getOrePriceSummary(db, "GOLD");

    expect(summary.refined?.bestSell).toMatchObject({
      priceSell: 28000,
      terminalName: "TDD Area 18",
    });
    expect(summary.raw?.bestSell).toMatchObject({ priceSell: 14000 });
    expect(summary.syncedAt).not.toBeNull();
  });

  it("lists refinery yields per ore sorted by bonus desc", async () => {
    await syncUex(db);

    const yields = await findRefineryYieldsByOre(db, "IRON");
    expect(yields).toHaveLength(1);
    expect(yields[0]).toMatchObject({ terminalId: 755, bonusPercent: -5 });
  });

  it("returns an empty summary for ores without price data", async () => {
    await syncUex(db);

    const summary = await getOrePriceSummary(db, "IRON");
    expect(summary.raw).toBeNull();
    expect(summary.refined).toBeNull();
  });
});
