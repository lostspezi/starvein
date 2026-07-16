import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  getCachedVehicleOffersByCodes,
  getVehicleOffersByCodes,
} from "./vehicle-prices.read";
import type { VehiclePrice } from "./vehicle-prices.schema";

const SYNCED_AT = "2026-07-16T09:00:00.000Z";

function doc(overrides: Partial<VehiclePrice>): VehiclePrice {
  return {
    vehicleCode: "prospector",
    offerType: "purchase",
    terminalId: 149,
    terminalName: "New Deal - Teasa Spaceport - Lorville",
    locationLabel: "Lorville · Hurston · Stanton",
    starSystemName: "Stanton",
    price: 2783020,
    syncedAt: SYNCED_AT,
    ...overrides,
  };
}

describe("getVehicleOffersByCodes", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("vehicle-prices-read"));
    await db.collection("vehiclePrices").insertMany([
      doc({ terminalId: 149, price: 2783020 }),
      doc({
        terminalId: 148,
        terminalName: "Astro Armada - Area 18",
        price: 2620000,
      }),
      doc({
        offerType: "rental",
        terminalId: 157,
        terminalName: "Vantage Rentals - ARC-L1",
        price: 73237,
      }),
      doc({ vehicleCode: "mole", terminalId: 149, price: 8483740 }),
    ]);
    await db
      .collection("syncMeta")
      .insertOne({ key: "uex", syncedAt: SYNCED_AT });
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("gruppiert nach Code und Angebotstyp, preissortiert aufsteigend", async () => {
    const result = await getVehicleOffersByCodes(db, ["prospector", "mole"]);

    expect(result.syncedAt).toBe(SYNCED_AT);
    const prospector = result.byCode.get("prospector");
    expect(prospector?.purchase.map((offer) => offer.price)).toEqual([
      2620000, 2783020,
    ]);
    expect(prospector?.rental.map((offer) => offer.price)).toEqual([73237]);
    expect(result.byCode.get("mole")?.purchase).toHaveLength(1);
    expect(result.byCode.get("mole")?.rental).toEqual([]);
  });

  it("lässt unbekannte Codes in der Map fehlen", async () => {
    const result = await getVehicleOffersByCodes(db, ["golem"]);
    expect(result.byCode.has("golem")).toBe(false);
  });

  it("liefert syncedAt null, wenn nie gesynct wurde", async () => {
    await db.collection("syncMeta").deleteMany({});
    const result = await getVehicleOffersByCodes(db, ["prospector"]);
    expect(result.syncedAt).toBeNull();
  });

  it("Cached-Variante fällt ohne REDIS_URL still auf Mongo zurück", async () => {
    delete process.env.REDIS_URL;
    const result = await getCachedVehicleOffersByCodes(db, ["prospector"]);
    expect(result.byCode.get("prospector")?.purchase).toHaveLength(2);
    expect(result.syncedAt).toBe(SYNCED_AT);
  });
});
