import type { Db } from "mongodb";
import type { BodyType } from "@/features/locations/locations.schema";
import { findAllOccurrences } from "@/features/ore-occurrences/ore-occurrences.repository";
import type { OreOccurrence } from "@/features/ore-occurrences/ore-occurrences.schema";
import type { MiningMethod, RarityTier } from "@/features/ores/ores.schema";
import { getBestRefinedSellByOre } from "@/features/refinery-and-prices/price-summary";

export type ExplorerFilters = {
  method: MiningMethod | null;
  system: string | null;
  ore: string | null;
  rarity: RarityTier | null;
};

export type ExplorerRow = OreOccurrence & {
  oreName: string;
  rarityTier: RarityTier;
  bodyName: string;
  bodyType: BodyType;
  bestRefinedSell: number | null;
};

/**
 * Read-Model des Startseiten-Explorers: alle Vorkommen, gejoint mit
 * Erz (Name, Seltenheit), Himmelskörper (Name, Typ) und bestem
 * Refined-Verkaufspreis. Sortierung: Wahrscheinlichkeit absteigend
 * (kommt aus dem Repository). Bei >~1000 Vorkommen Pagination ergänzen.
 */
export async function findExplorerRows(
  db: Db,
  filters: ExplorerFilters,
): Promise<ExplorerRow[]> {
  const [occurrences, priceMap] = await Promise.all([
    findAllOccurrences(db, {
      method: filters.method,
      systemCode: filters.system,
      oreCode: filters.ore,
    }),
    getBestRefinedSellByOre(db),
  ]);
  if (occurrences.length === 0) return [];

  const oreCodes = [...new Set(occurrences.map((o) => o.oreCode))];
  const bodyKeys = [
    ...new Map(
      occurrences.map((o) => [
        `${o.systemCode}|${o.bodySlug}`,
        { systemCode: o.systemCode, slug: o.bodySlug },
      ]),
    ).values(),
  ];

  const [oreDocs, bodyDocs] = await Promise.all([
    db
      .collection("ores")
      .find(
        { code: { $in: oreCodes } },
        { projection: { _id: 0, code: 1, name_en: 1, rarityTier: 1 } },
      )
      .toArray(),
    db
      .collection("celestialBodies")
      .find(
        { $or: bodyKeys },
        { projection: { _id: 0, systemCode: 1, slug: 1, name: 1, type: 1 } },
      )
      .toArray(),
  ]);

  const ores = new Map(oreDocs.map((o) => [o.code as string, o]));
  const bodies = new Map(bodyDocs.map((b) => [`${b.systemCode}|${b.slug}`, b]));

  const rows = occurrences.map((occurrence) => {
    const ore = ores.get(occurrence.oreCode);
    const body = bodies.get(`${occurrence.systemCode}|${occurrence.bodySlug}`);
    return {
      ...occurrence,
      oreName: (ore?.name_en as string) ?? occurrence.oreCode,
      rarityTier: (ore?.rarityTier as RarityTier) ?? "common",
      bodyName: (body?.name as string) ?? occurrence.bodySlug,
      bodyType: (body?.type as BodyType) ?? "planet",
      bestRefinedSell: priceMap.get(occurrence.oreCode) ?? null,
    };
  });

  return filters.rarity
    ? rows.filter((row) => row.rarityTier === filters.rarity)
    : rows;
}
