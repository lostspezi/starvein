import { describe, expect, it } from "vitest";
import { signatureProfileSchema } from "./signature-profiles.schema";

const shipProfile = {
  oreCode: "QUAN",
  method: "ship",
  signatureValue: 3170,
  dominantCompositionRange: { min: 40, max: 80 },
  notes: "+ Beryl (10-20%)",
  patchVersion: "4.7",
  sourceType: "curated",
  confidenceScore: 0.6,
};

const groundProfile = {
  oreCode: "HADA",
  method: "fps",
  signatureValue: 3000,
  patchVersion: "4.7",
  sourceType: "curated",
  confidenceScore: 0.6,
};

describe("signatureProfileSchema", () => {
  it("accepts a ship profile with value and composition range", () => {
    expect(signatureProfileSchema.parse(shipProfile)).toEqual(shipProfile);
  });

  it("accepts a ground profile without composition range", () => {
    expect(signatureProfileSchema.parse(groundProfile)).toEqual(groundProfile);
  });

  it("accepts a signatureRange instead of a single value", () => {
    const ranged = {
      ...groundProfile,
      signatureValue: undefined,
      signatureRange: { min: 1700, max: 2400 },
    };
    const parsed = signatureProfileSchema.parse(ranged);
    expect(parsed.signatureRange).toEqual({ min: 1700, max: 2400 });
  });

  it("rejects profiles with neither value nor range", () => {
    const rest: Record<string, unknown> = { ...groundProfile };
    delete rest.signatureValue;
    expect(signatureProfileSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects profiles with both value and range", () => {
    expect(
      signatureProfileSchema.safeParse({
        ...groundProfile,
        signatureRange: { min: 1, max: 2 },
      }).success,
    ).toBe(false);
  });

  it("rejects inverted composition ranges", () => {
    expect(
      signatureProfileSchema.safeParse({
        ...shipProfile,
        dominantCompositionRange: { min: 80, max: 40 },
      }).success,
    ).toBe(false);
  });
});
