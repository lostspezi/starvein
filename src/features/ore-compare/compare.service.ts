import type { Db } from "mongodb";
import type { OccurrenceWithLocation } from "@/features/ore-occurrences/ore-occurrences.service";
import { findOccurrencesByOreWithLocationCached } from "@/features/ore-occurrences/ore-occurrences.service";
import { findOreByCode } from "@/features/ores/ores.repository";
import type { Ore } from "@/features/ores/ores.schema";
import { getOrePriceSummary } from "@/features/refinery-and-prices/price-summary";
import { findSignatureProfilesByOre } from "@/features/signature-profiles/signature-profiles.repository";
import type { SignatureProfile } from "@/features/signature-profiles/signature-profiles.schema";

import { MAX_COMPARE_ORES } from "./compare.constants";

export { MAX_COMPARE_ORES };

const TOP_LOCATIONS = 3;

export type OreComparisonColumn = {
  ore: Ore;
  shipSignature: SignatureProfile | null;
  groundSignatures: SignatureProfile[];
  bestRawSell: number | null;
  bestRefinedSell: number | null;
  topLocations: OccurrenceWithLocation[];
};

/**
 * Vergleichsdaten für bis zu MAX_COMPARE_ORES Erze: Signaturen, beste
 * Verkaufspreise (roh/raffiniert) und die Top-Fundorte nach
 * Wahrscheinlichkeit. Unbekannte Codes werden ignoriert.
 */
export async function getOreComparison(
  db: Db,
  codes: string[],
): Promise<OreComparisonColumn[]> {
  const limited = [...new Set(codes)].slice(0, MAX_COMPARE_ORES);

  const columns = await Promise.all(
    limited.map(async (code): Promise<OreComparisonColumn | null> => {
      const ore = await findOreByCode(db, code);
      if (!ore) return null;

      const [profiles, prices, occurrences] = await Promise.all([
        findSignatureProfilesByOre(db, ore.code),
        getOrePriceSummary(db, ore.code),
        findOccurrencesByOreWithLocationCached(db, ore.code),
      ]);

      return {
        ore,
        shipSignature:
          profiles.find((profile) => profile.method === "ship") ?? null,
        groundSignatures: profiles.filter(
          (profile) => profile.method !== "ship",
        ),
        bestRawSell: prices.raw?.bestSell?.priceSell ?? null,
        bestRefinedSell: prices.refined?.bestSell?.priceSell ?? null,
        topLocations: occurrences.slice(0, TOP_LOCATIONS),
      };
    }),
  );

  return columns.filter((column) => column !== null);
}
