import { describe, expect, it } from "vitest";
import {
  EQUIPMENT_KINDS,
  equipmentPriceSchema,
} from "./equipment-prices.schema";

const price = {
  equipmentCode: "helix-ii",
  kind: "laser",
  terminalId: 21,
  terminalName: "Dumper's Depot - Area18",
  locationLabel: "Area18 · ArcCorp · Stanton",
  priceBuy: 43500,
  syncedAt: "2026-07-13T09:00:00.000Z",
};

describe("equipmentPriceSchema", () => {
  it("accepts a complete price record", () => {
    expect(equipmentPriceSchema.parse(price)).toEqual(price);
  });

  it("allows an empty location label", () => {
    expect(
      equipmentPriceSchema.safeParse({ ...price, locationLabel: "" }).success,
    ).toBe(true);
  });

  it("rejects non-positive buy prices", () => {
    expect(
      equipmentPriceSchema.safeParse({ ...price, priceBuy: 0 }).success,
    ).toBe(false);
  });

  it("rejects non-kebab-case codes", () => {
    expect(
      equipmentPriceSchema.safeParse({ ...price, equipmentCode: "HelixII" })
        .success,
    ).toBe(false);
  });

  it("rejects unknown kinds", () => {
    expect(
      equipmentPriceSchema.safeParse({ ...price, kind: "vehicle" }).success,
    ).toBe(false);
  });
});

describe("EQUIPMENT_KINDS", () => {
  it("covers laser, module and gadget", () => {
    expect(EQUIPMENT_KINDS).toEqual(["laser", "module", "gadget"]);
  });
});
