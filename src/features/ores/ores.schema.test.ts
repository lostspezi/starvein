import { describe, expect, it } from "vitest";
import { oreSchema } from "./ores.schema";

const validOre = {
  code: "QUAN",
  name_de: "Quantainium",
  name_en: "Quantainium",
  rarityTier: "legendary",
  mineableBy: { ship: true, roc: false, fps: false },
};

describe("oreSchema", () => {
  it("accepts a valid ore", () => {
    expect(oreSchema.parse(validOre)).toEqual(validOre);
  });

  it("rejects unknown rarity tiers", () => {
    expect(
      oreSchema.safeParse({ ...validOre, rarityTier: "mythic" }).success,
    ).toBe(false);
  });

  it("rejects malformed codes", () => {
    expect(oreSchema.safeParse({ ...validOre, code: "quan" }).success).toBe(
      false,
    );
    expect(oreSchema.safeParse({ ...validOre, code: "TOOLONGX" }).success).toBe(
      false,
    );
  });

  it("requires all three mineableBy flags", () => {
    expect(
      oreSchema.safeParse({ ...validOre, mineableBy: { ship: true } }).success,
    ).toBe(false);
  });
});
