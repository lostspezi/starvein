import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { getEquipmentPurchasesByCodes } from "./equipment-prices.read";
import type { EquipmentPrice } from "./equipment-prices.schema";

const SYNCED_AT = "2026-07-13T09:00:00.000Z";

function price(overrides: Partial<EquipmentPrice> = {}): EquipmentPrice {
  return {
    equipmentCode: "helix-ii",
    kind: "laser",
    terminalId: 21,
    terminalName: "Dumper's Depot - Area18",
    locationLabel: "Area18 · ArcCorp · Stanton",
    priceBuy: 43500,
    syncedAt: SYNCED_AT,
    ...overrides,
  };
}

describe("getEquipmentPurchasesByCodes", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("equipment-prices-read"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("groups by code, sorted by price ascending", async () => {
    await db.collection("equipmentPrices").insertMany([
      { ...price() },
      {
        ...price({
          terminalId: 22,
          terminalName: "Shubin SMO-10",
          priceBuy: 41000,
        }),
      },
      {
        ...price({
          equipmentCode: "optimax",
          kind: "gadget",
          terminalId: 40,
          priceBuy: 4500,
        }),
      },
    ]);
    await db
      .collection("syncMeta")
      .insertOne({ key: "uex", syncedAt: SYNCED_AT });

    const result = await getEquipmentPurchasesByCodes(db, [
      "helix-ii",
      "optimax",
      "unknown-code",
    ]);

    expect(result.syncedAt).toBe(SYNCED_AT);
    expect(result.byCode.get("helix-ii")?.map((p) => p.priceBuy)).toEqual([
      41000, 43500,
    ]);
    expect(result.byCode.get("optimax")).toHaveLength(1);
    expect(result.byCode.has("unknown-code")).toBe(false);
  });

  it("returns null syncedAt before any sync", async () => {
    const result = await getEquipmentPurchasesByCodes(db, ["helix-ii"]);
    expect(result.syncedAt).toBeNull();
    expect(result.byCode.size).toBe(0);
  });
});
