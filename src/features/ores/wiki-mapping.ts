/**
 * Reines Mapping Wiki-Commodity -> Ore (kein I/O).
 *
 * Die has_*-Booleans sind maßgeblich für mineableBy — das methods-Array des
 * Wikis ist bei manchen Gems leer, obwohl sie minebar sind (verifiziert
 * 2026-07-16: Carinite, Sadaryx, Jaclium, Saldynium). Für genau diese Fälle
 * greift mineableByFallback aus dem kuratierten Mapping.
 */
import type { ScWikiCommodity } from "@/lib/scwiki-client";
import type { OreCodeMapping } from "./curated-ore-codes";
import { RARITY_TIERS, type Ore, type RarityTier } from "./ores.schema";

function isRarityTier(value: string | null): value is RarityTier {
  return (RARITY_TIERS as readonly string[]).includes(value ?? "");
}

/**
 * Mappt ein Wiki-Mineable auf den Erz-Katalog oder null, wenn keinerlei
 * Methoden-Information vorliegt (weder Wiki-Booleans noch Fallback).
 */
export function mapWikiCommodityToOre(
  commodity: ScWikiCommodity,
  mapping: OreCodeMapping,
): Ore | null {
  const wikiMineableBy = {
    ship: commodity.has_ship_mineables,
    roc: commodity.has_ground_vehicle_mineables,
    fps: commodity.has_fps_mineables,
  };
  const hasWikiMethods =
    wikiMineableBy.ship || wikiMineableBy.roc || wikiMineableBy.fps;

  const mineableBy = hasWikiMethods
    ? wikiMineableBy
    : mapping.mineableByFallback;
  if (!mineableBy) return null;

  const ore: Ore = {
    code: mapping.code,
    name_de: mapping.name_de,
    name_en: mapping.name_en,
    rarityTier: isRarityTier(commodity.tier)
      ? commodity.tier
      : mapping.rarityTierFallback,
    mineableBy,
  };

  if (commodity.density_g_per_cc !== null && commodity.density_g_per_cc > 0) {
    ore.density = commodity.density_g_per_cc;
  }
  if (commodity.instability !== null) ore.instability = commodity.instability;
  if (commodity.resistance !== null) ore.resistance = commodity.resistance;

  return ore;
}
