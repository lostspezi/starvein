/**
 * Reines Mapping Wiki-Commodity-Fundorte -> OreOccurrences (kein I/O).
 *
 * Das Wiki liefert Fundorte pro Erz mit uuid statt Slug — der Join läuft
 * über die im Locations-Sync gespeicherte wikiUuid. Ein Fundort-Eintrag
 * trägt keine Methode; sie ergibt sich aus mineableBy des Erzes (Fan-out:
 * ein Gem mit roc+fps ergibt zwei Rows, passend zum Schema).
 */
import type { CelestialBody } from "@/features/locations/locations.schema";
import {
  MINING_METHODS,
  type MiningMethod,
  type Ore,
} from "@/features/ores/ores.schema";
import type { ScWikiCommodityLocation } from "@/lib/scwiki-client";
import type { OreOccurrence } from "./ore-occurrences.schema";

/** Spieldaten aus dem Wiki gelten als verifiziert (Badge-Schwelle: 0.7). */
export const WIKI_CONFIDENCE_SCORE = 0.9;

/** "4.8.2-LIVE.12030094" -> "4.8.2". */
export function shortGameVersion(version: string): string {
  return version.split("-")[0];
}

export function buildUuidToBodyMap(
  bodies: CelestialBody[],
): Map<string, { systemCode: string; slug: string }> {
  const map = new Map<string, { systemCode: string; slug: string }>();
  for (const body of bodies) {
    if (body.wikiUuid) {
      map.set(body.wikiUuid, { systemCode: body.systemCode, slug: body.slug });
    }
  }
  return map;
}

export function enabledMethods(ore: Ore): MiningMethod[] {
  return MINING_METHODS.filter((method) => ore.mineableBy[method]);
}

/**
 * Mappt die Fundort-Liste eines Erzes auf Occurrence-Rows. Einträge ohne
 * auflösbare Location (weggefilterte Typen) oder ohne Wahrscheinlichkeit
 * werden gezählt und übersprungen.
 */
export function mapWikiOccurrences({
  locations,
  ore,
  uuidMap,
  patchVersion,
  syncedAt,
}: {
  locations: ScWikiCommodityLocation[];
  ore: Ore;
  uuidMap: Map<string, { systemCode: string; slug: string }>;
  patchVersion: string;
  syncedAt: string;
}): { occurrences: OreOccurrence[]; skipped: number } {
  const occurrences: OreOccurrence[] = [];
  let skipped = 0;

  for (const entry of locations) {
    const body = uuidMap.get(entry.uuid);
    if (!body || entry.group_probability_percent === null) {
      skipped++;
      continue;
    }

    for (const method of enabledMethods(ore)) {
      const occurrence: OreOccurrence = {
        oreCode: ore.code,
        systemCode: body.systemCode,
        bodySlug: body.slug,
        method,
        probabilityPercent: entry.group_probability_percent,
        patchVersion,
        sourceType: "wiki",
        confidenceScore: WIKI_CONFIDENCE_SCORE,
        lastVerifiedAt: syncedAt,
      };
      if (entry.relative_probability_percent !== null) {
        occurrence.relativeProbabilityPercent =
          entry.relative_probability_percent;
      }
      occurrences.push(occurrence);
    }
  }

  return { occurrences, skipped };
}
