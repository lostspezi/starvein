import type { MiningMethod } from "@/features/ores/ores.schema";
import type { OccurrenceWithLocation } from "./ore-occurrences.service";

export type OreOccurrenceStats = {
  locationCount: number;
  systemCount: number;
  best: {
    bodyName: string;
    probabilityPercent: number;
    method: MiningMethod;
  } | null;
};

/**
 * Kennzahlen für den Auto-Summary-Satz der Erz-Detailseite (und deren
 * Meta-Description): Anzahl Fundorte/Systeme plus bester Fundort —
 * bewusst ohne Annahme über die Sortierung der Eingabe.
 */
export function buildOreOccurrenceStats(
  occurrences: OccurrenceWithLocation[],
): OreOccurrenceStats {
  const locations = new Set(
    occurrences.map((o) => `${o.systemCode}|${o.bodySlug}`),
  );
  const systems = new Set(occurrences.map((o) => o.systemCode));
  const best = occurrences.reduce<OccurrenceWithLocation | null>(
    (top, o) =>
      top === null || o.probabilityPercent > top.probabilityPercent ? o : top,
    null,
  );

  return {
    locationCount: locations.size,
    systemCount: systems.size,
    best: best
      ? {
          bodyName: best.bodyName,
          probabilityPercent: best.probabilityPercent,
          method: best.method,
        }
      : null,
  };
}
