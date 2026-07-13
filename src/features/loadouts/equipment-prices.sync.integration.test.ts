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
import { closeMongo, getDb } from "@/lib/db";
import { UEX_TEST_BASE_URL, uexServer } from "@/test/uex-server";
import { uniqueDbName } from "@/test/factories";
import {
  upsertMiningGadgets,
  upsertMiningLasers,
  upsertMiningModules,
} from "./equipment.repository";
import { syncEquipmentPrices } from "./equipment-prices.sync";

const SYNCED_AT = "2026-07-13T09:00:00.000Z";
const patchVersion = "4.7";

async function seedCatalog(db: Db): Promise<void> {
  await upsertMiningLasers(db, [
    {
      code: "helix-ii",
      name: "Helix II",
      manufacturer: "Thermyte Concern",
      size: 2,
      moduleSlots: 3,
      stats: {
        laserPower: 4080,
        extractionLaserPower: 2590,
        optimalRange: 30,
        maxRange: 90,
      },
      modifiers: {},
      patchVersion,
    },
  ]);
  await upsertMiningModules(db, [
    {
      code: "rieger-c3",
      name: "Rieger-C3",
      manufacturer: "Shubin Interstellar",
      type: "passive",
      charges: null,
      durationSeconds: null,
      modifiers: {},
      patchVersion,
    },
    {
      code: "roc-module",
      name: "ROC Module",
      manufacturer: "Thermyte Concern",
      type: "passive",
      charges: null,
      durationSeconds: null,
      modifiers: {},
      patchVersion,
    },
  ]);
  await upsertMiningGadgets(db, [
    {
      code: "optimax",
      name: "OptiMax",
      manufacturer: "Greycat Industrial",
      modifiers: {},
      patchVersion,
    },
  ]);
}

describe("syncEquipmentPrices", () => {
  let db: Db;

  beforeAll(() => {
    uexServer.listen({ onUnhandledRequest: "error" });
    process.env.UEX_API_BASE_URL = UEX_TEST_BASE_URL;
  });

  beforeEach(async () => {
    db = await getDb(uniqueDbName("equipment-prices"));
    await seedCatalog(db);
  });

  afterEach(() => {
    uexServer.resetHandlers();
  });

  afterAll(async () => {
    uexServer.close();
    delete process.env.UEX_API_BASE_URL;
    await closeMongo();
  });

  it("syncs mapped equipment prices with location labels", async () => {
    const count = await syncEquipmentPrices(db, SYNCED_AT);

    expect(count).toBe(5);
    const docs = await db
      .collection("equipmentPrices")
      .find({}, { projection: { _id: 0 } })
      .toArray();
    expect(docs).toHaveLength(5);

    const helixCheapest = docs.find(
      (doc) => doc.equipmentCode === "helix-ii" && doc.terminalId === 22,
    );
    expect(helixCheapest).toEqual({
      equipmentCode: "helix-ii",
      kind: "laser",
      terminalId: 22,
      terminalName: "Shubin Mining Facility SMO-10",
      locationLabel: "Shubin SMO-10 · Lyria · Stanton",
      priceBuy: 41000,
      syncedAt: SYNCED_AT,
    });
  });

  it("filters player-owned terminals, zero prices and unmapped items", async () => {
    await syncEquipmentPrices(db, SYNCED_AT);

    const docs = await db.collection("equipmentPrices").find({}).toArray();
    expect(docs.some((doc) => doc.terminalId === 23)).toBe(false); // player-owned
    expect(docs.some((doc) => doc.priceBuy === 0)).toBe(false);
    expect(docs.some((doc) => doc.equipmentCode === "unmapped")).toBe(false);
  });

  it("maps roc-module via the raw-slug fallback", async () => {
    await syncEquipmentPrices(db, SYNCED_AT);

    const roc = await db
      .collection("equipmentPrices")
      .findOne({ equipmentCode: "roc-module" });
    expect(roc).not.toBeNull();
    expect(roc?.kind).toBe("module");
  });

  it("is idempotent on re-runs", async () => {
    await syncEquipmentPrices(db, SYNCED_AT);
    await syncEquipmentPrices(db, SYNCED_AT);

    await expect(
      db.collection("equipmentPrices").countDocuments(),
    ).resolves.toBe(5);
  });

  it("removes terminals that disappeared from UEX", async () => {
    await db.collection("equipmentPrices").insertOne({
      equipmentCode: "helix-ii",
      kind: "laser",
      terminalId: 999,
      terminalName: "Closed Shop",
      locationLabel: "",
      priceBuy: 1,
      syncedAt: "2026-01-01T00:00:00.000Z",
    });

    await syncEquipmentPrices(db, SYNCED_AT);

    await expect(
      db.collection("equipmentPrices").countDocuments({ terminalId: 999 }),
    ).resolves.toBe(0);
  });
});
