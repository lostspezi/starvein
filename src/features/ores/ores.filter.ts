import type { MiningMethod, Ore, RarityTier } from "./ores.schema";

export type OreFilter = {
  rarity?: RarityTier | null;
  method?: MiningMethod | null;
};

export function filterOres<T extends Ore>(
  ores: T[],
  { rarity, method }: OreFilter,
): T[] {
  return ores.filter(
    (ore) =>
      (!rarity || ore.rarityTier === rarity) &&
      (!method || ore.mineableBy[method]),
  );
}
