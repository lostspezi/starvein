import { describe, expect, it } from "vitest";
import { filterOres } from "./ores.filter";
import type { Ore } from "./ores.schema";

const quan: Ore = {
  code: "QUAN",
  name_de: "Quantainium",
  name_en: "Quantainium",
  rarityTier: "legendary",
  mineableBy: { ship: true, roc: false, fps: false },
};
const hada: Ore = {
  code: "HADA",
  name_de: "Hadanite",
  name_en: "Hadanite",
  rarityTier: "epic",
  mineableBy: { ship: false, roc: true, fps: true },
};
const jana: Ore = {
  code: "JANA",
  name_de: "Janalite",
  name_en: "Janalite",
  rarityTier: "legendary",
  mineableBy: { ship: false, roc: true, fps: true },
};
const all = [quan, hada, jana];

describe("filterOres", () => {
  it("returns everything without filters", () => {
    expect(filterOres(all, {})).toEqual(all);
  });

  it("filters by rarity", () => {
    expect(filterOres(all, { rarity: "epic" })).toEqual([hada]);
  });

  it("filters by mining method", () => {
    expect(filterOres(all, { method: "ship" })).toEqual([quan]);
  });

  it("combines rarity and method", () => {
    expect(filterOres(all, { rarity: "legendary", method: "roc" })).toEqual([
      jana,
    ]);
  });
});
