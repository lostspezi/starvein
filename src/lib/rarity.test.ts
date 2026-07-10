import { describe, expect, it } from "vitest";
import { RARITY_TIERS } from "@/features/ores/ores.schema";
import { RARITY_TEXT_CLASS } from "./rarity";

describe("RARITY_TEXT_CLASS", () => {
  it("maps every rarity tier to its text utility", () => {
    for (const tier of RARITY_TIERS) {
      expect(RARITY_TEXT_CLASS[tier]).toBe(`text-rarity-${tier}`);
    }
  });

  it("contains no extra keys", () => {
    expect(Object.keys(RARITY_TEXT_CLASS).sort()).toEqual(
      [...RARITY_TIERS].sort(),
    );
  });
});
