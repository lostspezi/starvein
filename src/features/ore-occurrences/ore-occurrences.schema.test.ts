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
});
