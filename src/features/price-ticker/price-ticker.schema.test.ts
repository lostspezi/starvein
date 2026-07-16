import { describe, expect, it } from "vitest";
import { priceDailyCloseSchema } from "./price-ticker.schema";

describe("priceDailyCloseSchema", () => {
  const valid = {
    oreCode: "QUAN",
    date: "2026-07-15",
    bestSell: 88.5,
    syncedAt: "2026-07-15T23:45:00.000Z",
  };

  it("parses a valid daily close", () => {
    expect(priceDailyCloseSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a date that is not YYYY-MM-DD", () => {
    expect(
      priceDailyCloseSchema.safeParse({ ...valid, date: "15.07.2026" }).success,
    ).toBe(false);
    expect(
      priceDailyCloseSchema.safeParse({
        ...valid,
        date: "2026-07-15T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("rejects non-positive bestSell values", () => {
    expect(
      priceDailyCloseSchema.safeParse({ ...valid, bestSell: 0 }).success,
    ).toBe(false);
    expect(
      priceDailyCloseSchema.safeParse({ ...valid, bestSell: -5 }).success,
    ).toBe(false);
  });

  it("rejects ore codes that are not 2-5 uppercase letters", () => {
    expect(
      priceDailyCloseSchema.safeParse({ ...valid, oreCode: "quan" }).success,
    ).toBe(false);
    expect(
      priceDailyCloseSchema.safeParse({ ...valid, oreCode: "QUANTA" }).success,
    ).toBe(false);
  });
});
