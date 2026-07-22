import { describe, expect, it } from "vitest";
import { oreOccurrenceSchema } from "./ore-occurrences.schema";

const valid = {
  oreCode: "HADA",
  systemCode: "STANTON",
  bodySlug: "daymar",
  method: "fps",
  probabilityPercent: 30,
  patchVersion: "4.7",
  sourceType: "curated",
  confidenceScore: 0.3,
  lastVerifiedAt: "2026-07-09",
};

describe("oreOccurrenceSchema", () => {
  it("accepts a valid occurrence", () => {
    expect(oreOccurrenceSchema.parse(valid)).toEqual(valid);
  });

  it("bounds probabilityPercent to 0-100", () => {
    expect(
      oreOccurrenceSchema.safeParse({ ...valid, probabilityPercent: 101 })
        .success,
    ).toBe(false);
    expect(
      oreOccurrenceSchema.safeParse({ ...valid, probabilityPercent: -1 })
        .success,
    ).toBe(false);
  });

  it("bounds confidenceScore to 0-1", () => {
    expect(
      oreOccurrenceSchema.safeParse({ ...valid, confidenceScore: 1.2 }).success,
    ).toBe(false);
  });

  it("rejects unknown methods and source types", () => {
    expect(
      oreOccurrenceSchema.safeParse({ ...valid, method: "laser" }).success,
    ).toBe(false);
    expect(
      oreOccurrenceSchema.safeParse({ ...valid, sourceType: "vendor" }).success,
    ).toBe(false);
  });

  it("accepts the optional deposit fields", () => {
    const withDeposit = {
      ...valid,
      depositType: "secondary",
      compositionPercent: { min: 2, max: 5 },
      byproductOf: ["BEXA", "GOLD"],
      rockBreakdown: [
        {
          rockLabel: "Bexalite",
          isPrimary: false,
          oreCompositionPercent: { min: 2, max: 5 },
          dominantMaterialName: "Bexalite (Raw)",
          dominantMaterialOreCode: "BEXA",
        },
      ],
    };
    expect(oreOccurrenceSchema.parse(withDeposit)).toEqual(withDeposit);
  });

  it("still parses legacy documents without deposit fields", () => {
    const parsed = oreOccurrenceSchema.parse(valid);
    expect(parsed).not.toHaveProperty("depositType");
    expect(parsed).not.toHaveProperty("rockBreakdown");
  });

  it("rejects invalid deposit values", () => {
    expect(
      oreOccurrenceSchema.safeParse({ ...valid, depositType: "both" }).success,
    ).toBe(false);
    expect(
      oreOccurrenceSchema.safeParse({
        ...valid,
        compositionPercent: { min: -1, max: 5 },
      }).success,
    ).toBe(false);
    expect(
      oreOccurrenceSchema.safeParse({
        ...valid,
        compositionPercent: { min: 2, max: 101 },
      }).success,
    ).toBe(false);
    expect(
      oreOccurrenceSchema.safeParse({ ...valid, byproductOf: ["bexa"] })
        .success,
    ).toBe(false);
    expect(
      oreOccurrenceSchema.safeParse({
        ...valid,
        rockBreakdown: [
          {
            rockLabel: "",
            isPrimary: true,
            oreCompositionPercent: { min: 24, max: 74 },
            dominantMaterialName: "Borase (Ore)",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
