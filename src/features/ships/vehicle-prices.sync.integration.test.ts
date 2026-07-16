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
import { HttpResponse, http } from "msw";
import { closeMongo, getDb } from "@/lib/db";
import { UEX_TEST_BASE_URL, uexServer } from "@/test/uex-server";
import { uniqueDbName } from "@/test/factories";
import { upsertMiningVehicles } from "@/features/loadouts/equipment.repository";
import { syncVehiclePrices } from "./vehicle-prices.sync";

const SYNCED_AT = "2026-07-16T09:00:00.000Z";
const patchVersion = "4.7";

async function seedVehicles(db: Db): Promise<void> {
  await upsertMiningVehicles(db, [
    {
      code: "prospector",
      name: "Prospector",
      manufacturer: "MISC",
      method: "ship",
      hardpoints: [{ size: 1 }],
      gadgetCapable: true,
      stockLaserCode: "arbor-mh1",
      patchVersion,
    },
    {
      code: "mole",
      name: "MOLE",
      manufacturer: "Argo Astronautics",
      method: "ship",
      hardpoints: [{ size: 2 }, { size: 2 }, { size: 2 }],
      gadgetCapable: true,
      stockLaserCode: "arbor-mh2",
      patchVersion,
    },
  ]);
}

describe("syncVehiclePrices", () => {
  let db: Db;

  beforeAll(() => {
    uexServer.listen({ onUnhandledRequest: "error" });
    process.env.UEX_API_BASE_URL = UEX_TEST_BASE_URL;
  });

  beforeEach(async () => {
    db = await getDb(uniqueDbName("vehicle-prices"));
    await seedVehicles(db);
  });

  afterEach(() => {
    uexServer.resetHandlers();
  });

  afterAll(async () => {
    uexServer.close();
    delete process.env.UEX_API_BASE_URL;
    await closeMongo();
  });

  it("syncs purchase and rental prices with location labels", async () => {
    const count = await syncVehiclePrices(db, SYNCED_AT);

    // prospector: 2 Käufe (player-owned + Nullpreis gefiltert) + 2 Mieten,
    // mole: 1 Kauf + 1 Miete
    expect(count).toBe(6);

    const purchase = await db
      .collection("vehiclePrices")
      .findOne(
        { vehicleCode: "prospector", offerType: "purchase", terminalId: 149 },
        { projection: { _id: 0 } },
      );
    expect(purchase).toEqual({
      vehicleCode: "prospector",
      offerType: "purchase",
      terminalId: 149,
      terminalName: "New Deal - Teasa Spaceport - Lorville",
      locationLabel: "Lorville · Hurston · Stanton",
      starSystemName: "Stanton",
      price: 2783020,
      syncedAt: SYNCED_AT,
    });

    const rental = await db
      .collection("vehiclePrices")
      .findOne(
        { vehicleCode: "prospector", offerType: "rental", terminalId: 157 },
        { projection: { _id: 0 } },
      );
    expect(rental).toEqual({
      vehicleCode: "prospector",
      offerType: "rental",
      terminalId: 157,
      terminalName: "Vantage Rentals - ARC-L1",
      // buildLocationLabel-Präzedenz: Mond → Planet → Orbit (wie Equipment)
      locationLabel: "ARC-L1 Wide Forest Station · ArcCorp · Stanton",
      starSystemName: "Stanton",
      price: 73237,
      syncedAt: SYNCED_AT,
    });
  });

  it("filters player-owned terminals, zero prices and unmapped vehicles", async () => {
    await syncVehiclePrices(db, SYNCED_AT);

    const docs = await db.collection("vehiclePrices").find({}).toArray();
    expect(docs.some((doc) => doc.terminalId === 900)).toBe(false); // player-owned
    expect(docs.some((doc) => doc.price === 0)).toBe(false);
    // mole-carbon-edition ist unmapped — es darf kein Dokument mit fremdem Code geben
    expect(
      docs.every((doc) => ["prospector", "mole"].includes(doc.vehicleCode)),
    ).toBe(true);
  });

  it("keeps records without geo names, with empty location label", async () => {
    await syncVehiclePrices(db, SYNCED_AT);

    const molePurchase = await db
      .collection("vehiclePrices")
      .findOne({ vehicleCode: "mole", offerType: "purchase" });
    expect(molePurchase).not.toBeNull();
    expect(molePurchase?.locationLabel).toBe("");
    expect(molePurchase?.starSystemName).toBeNull();
  });

  it("is idempotent on re-runs", async () => {
    await syncVehiclePrices(db, SYNCED_AT);
    await syncVehiclePrices(db, SYNCED_AT);

    await expect(db.collection("vehiclePrices").countDocuments()).resolves.toBe(
      6,
    );
  });

  it("removes terminals that disappeared from UEX", async () => {
    await db.collection("vehiclePrices").insertOne({
      vehicleCode: "prospector",
      offerType: "purchase",
      terminalId: 999,
      terminalName: "Closed Shipyard",
      locationLabel: "",
      starSystemName: null,
      price: 1,
      syncedAt: "2026-01-01T00:00:00.000Z",
    });

    await syncVehiclePrices(db, SYNCED_AT);

    await expect(
      db.collection("vehiclePrices").countDocuments({ terminalId: 999 }),
    ).resolves.toBe(0);
  });

  it("never prunes rentals when the rental endpoint returns empty", async () => {
    await syncVehiclePrices(db, SYNCED_AT);
    await expect(
      db.collection("vehiclePrices").countDocuments({ offerType: "rental" }),
    ).resolves.toBe(3);

    // UEX-Teilausfall: Rentals leer, Purchases normal
    uexServer.use(
      http.get(`${UEX_TEST_BASE_URL}/vehicles_rentals_prices`, () =>
        HttpResponse.json({ status: "ok", data: [] }),
      ),
    );
    const LATER = "2026-07-17T09:00:00.000Z";
    await syncVehiclePrices(db, LATER);

    // Rentals vom Vorlauf überleben, Purchases wurden neu gestempelt
    await expect(
      db.collection("vehiclePrices").countDocuments({ offerType: "rental" }),
    ).resolves.toBe(3);
    await expect(
      db
        .collection("vehiclePrices")
        .countDocuments({ offerType: "purchase", syncedAt: LATER }),
    ).resolves.toBe(3);
    await expect(
      db
        .collection("vehiclePrices")
        .countDocuments({ offerType: "purchase", syncedAt: { $ne: LATER } }),
    ).resolves.toBe(0);
  });
});
