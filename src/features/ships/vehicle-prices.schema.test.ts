import { describe, expect, it } from "vitest";
import { OFFER_TYPES, vehiclePriceSchema } from "./vehicle-prices.schema";

const validPurchase = {
  vehicleCode: "prospector",
  offerType: "purchase",
  terminalId: 149,
  terminalName: "New Deal - Teasa Spaceport - Lorville",
  locationLabel: "Lorville · Hurston · Stanton",
  starSystemName: "Stanton",
  price: 2783020,
  syncedAt: "2026-07-16T12:00:00.000Z",
};

describe("vehiclePriceSchema", () => {
  it("parst ein gültiges Purchase-Dokument", () => {
    expect(vehiclePriceSchema.parse(validPurchase)).toEqual(validPurchase);
  });

  it("parst ein gültiges Rental-Dokument", () => {
    const rental = {
      ...validPurchase,
      offerType: "rental",
      terminalId: 157,
      terminalName: "Vantage Rentals - ARC-L1",
      price: 73237,
    };
    expect(vehiclePriceSchema.parse(rental)).toEqual(rental);
  });

  it("erlaubt leeres locationLabel und null-starSystemName (UEX ohne Geo-Daten)", () => {
    const doc = { ...validPurchase, locationLabel: "", starSystemName: null };
    expect(vehiclePriceSchema.parse(doc)).toEqual(doc);
  });

  it("wirft bei price 0", () => {
    expect(() =>
      vehiclePriceSchema.parse({ ...validPurchase, price: 0 }),
    ).toThrow();
  });

  it("wirft bei unbekanntem offerType", () => {
    expect(() =>
      vehiclePriceSchema.parse({ ...validPurchase, offerType: "loaner" }),
    ).toThrow();
  });

  it("wirft bei vehicleCode außerhalb des Kebab-Case-Schemas", () => {
    expect(() =>
      vehiclePriceSchema.parse({ ...validPurchase, vehicleCode: "Prospector" }),
    ).toThrow();
  });
});

describe("OFFER_TYPES", () => {
  it("kennt genau purchase und rental", () => {
    expect(OFFER_TYPES).toEqual(["purchase", "rental"]);
  });
});
