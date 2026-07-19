import type { Db } from "mongodb";
import type { BodyType } from "@/features/locations/locations.schema";
import { findAllOccurrences } from "@/features/ore-occurrences/ore-occurrences.repository";
import type { OreOccurrence } from "@/features/ore-occurrences/ore-occurrences.schema";
import type { MiningMethod, RarityTier } from "@/features/ores/ores.schema";
import { getBestSellByOre } from "@/features/refinery-and-prices/price-summary";

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
  // Scan-Signatur des Erzes für diese Methode (CLAUDE.md §5)
  signatureValue?: number;
  signatureRange?: { min: number; max: number };
  // Bester aktueller Verkaufspreis (aUEC/SCU) aus dem UEX-Sync
  bestRawSell: number | null;
  bestRefinedSell: number | null;
};

export type ExplorerResult = {
  /** Auf EXPLORER_ROW_LIMIT gekappte Rows (Wahrscheinlichkeit absteigend). */
  rows: ExplorerRow[];
  /** Gesamtzahl vor dem Cap — fürs "Top X von Y"-Hint im UI. */
  total: number;
};

/**
 * Der Wiki-Sync liefert tausende Vorkommen — ungekappt wächst das
 * SSR-HTML der Startseite auf mehrere MB und die Client-Hydration der
 * Tabelle wird spürbar träge (e2e-"load"-Timeouts). 200 entspricht etwa
 * dem Umfang des früheren kuratierten Datensatzes; Filter grenzen
 * serverseitig ein, der Cap greift nur fürs Rendering.
 */
export const EXPLORER_ROW_LIMIT = 200;

/**
 * Read-Model des Startseiten-Explorers: Vorkommen, gejoint mit
 * Erz (Name, Seltenheit), Himmelskörper (Name, Typ) und bestem
 * Refined-Verkaufspreis. Sortierung: Wahrscheinlichkeit absteigend
 * (kommt aus dem Repository), gekappt auf EXPLORER_ROW_LIMIT.
 */
export async function findExplorerRows(
  db: Db,
  filters: ExplorerFilters,
): Promise<ExplorerResult> {
  const [occurrences, priceMap] = await Promise.all([
    findAllOccurrences(db, {
      method: filters.method,
      systemCode: filters.system,
      oreCode: filters.ore,
    }),
    getBestSellByOre(db),
  ]);
  if (occurrences.length === 0) return { rows: [], total: 0 };

  const oreCodes = [...new Set(occurrences.map((o) => o.oreCode))];
  const bodyKeys = [
    ...new Map(
      occurrences.map((o) => [
        `${o.systemCode}|${o.bodySlug}`,
        { systemCode: o.systemCode, slug: o.bodySlug },
      ]),
    ).values(),
  ];

  const [oreDocs, bodyDocs, profileDocs] = await Promise.all([
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
    db
      .collection("signatureProfiles")
      .find(
        { oreCode: { $in: oreCodes } },
        {
          projection: {
            _id: 0,
            oreCode: 1,
            method: 1,
            signatureValue: 1,
            signatureRange: 1,
          },
        },
      )
      .toArray(),
  ]);

  const ores = new Map(oreDocs.map((o) => [o.code as string, o]));
  const bodies = new Map(bodyDocs.map((b) => [`${b.systemCode}|${b.slug}`, b]));
  const profiles = new Map(
    profileDocs.map((p) => [`${p.oreCode}|${p.method}`, p]),
  );

  const rows = occurrences.map((occurrence) => {
    const ore = ores.get(occurrence.oreCode);
    const body = bodies.get(`${occurrence.systemCode}|${occurrence.bodySlug}`);
    const profile = profiles.get(`${occurrence.oreCode}|${occurrence.method}`);
    const bestSell = priceMap.get(occurrence.oreCode);
    return {
      ...occurrence,
      oreName: (ore?.name_en as string) ?? occurrence.oreCode,
      rarityTier: (ore?.rarityTier as RarityTier) ?? "common",
      bodyName: (body?.name as string) ?? occurrence.bodySlug,
      bodyType: (body?.type as BodyType) ?? "planet",
      signatureValue: profile?.signatureValue as number | undefined,
      signatureRange: profile?.signatureRange as
        { min: number; max: number } | undefined,
      bestRawSell: bestSell?.raw ?? null,
      bestRefinedSell: bestSell?.refined ?? null,
    };
  });

  const filtered = filters.rarity
    ? rows.filter((row) => row.rarityTier === filters.rarity)
    : rows;

  return {
    rows: filtered.slice(0, EXPLORER_ROW_LIMIT),
    total: filtered.length,
  };
}

/** Zeilenbudget des kompakten Startseiten-Widgets. */
export const TOP_ORE_ROW_LIMIT = 10;

/**
 * Kompakt-Variante fürs Startseiten-Widget: pro Erz nur das Vorkommen mit
 * der höchsten Wahrscheinlichkeit (die Rows kommen bereits absteigend
 * sortiert), gekappt auf `limit`. `total` zählt weiterhin alle gefilterten
 * Vorkommen — für den "Alle X ansehen"-Link zur vollen Tabelle.
 */
export async function findTopOreRows(
  db: Db,
  filters: ExplorerFilters,
  limit: number = TOP_ORE_ROW_LIMIT,
): Promise<ExplorerResult> {
  const { rows, total } = await findExplorerRows(db, filters);

  const seen = new Set<string>();
  const deduped: ExplorerRow[] = [];
  for (const row of rows) {
    if (seen.has(row.oreCode)) continue;
    seen.add(row.oreCode);
    deduped.push(row);
    if (deduped.length >= limit) break;
  }

  return { rows: deduped, total };
}
