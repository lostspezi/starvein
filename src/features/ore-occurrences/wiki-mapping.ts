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
import type {
  ScWikiCommodityLocation,
  ScWikiLocationResource,
} from "@/lib/scwiki-client";
import type {
  DepositType,
  OreOccurrence,
  RockBreakdownEntry,
} from "./ore-occurrences.schema";

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

/** Wiki-Resource-Gruppen -> Mining-Methode (live verifiziert 2026-07-22). */
const WIKI_GROUP_TO_METHOD: Record<string, MiningMethod> = {
  SpaceShip_Mineables: "ship",
  GroundVehicle_Mineables: "roc",
  FPS_Mineables: "fps",
};

type CompositionRange = { min: number; max: number };

type DepositInfo = {
  depositType: DepositType;
  compositionPercent?: CompositionRange;
  byproductOf?: string[];
  rockBreakdown: RockBreakdownEntry[];
};

/** Materialien eines Rocks per Key über Quality-Bänder aggregiert. */
type MergedMaterial = {
  key: string;
  name: string;
  isCurrent: boolean;
  min: number;
  max: number;
};

function mergeMaterialBands(
  resource: ScWikiLocationResource,
): MergedMaterial[] {
  const byKey = new Map<string, MergedMaterial>();
  for (const mat of resource.materials ?? []) {
    if (mat.min_percentage === null || mat.max_percentage === null) continue;
    const merged = byKey.get(mat.key);
    if (merged) {
      merged.min = Math.min(merged.min, mat.min_percentage);
      merged.max = Math.max(merged.max, mat.max_percentage);
    } else {
      byKey.set(mat.key, {
        key: mat.key,
        name: mat.name,
        isCurrent: mat.is_current,
        min: mat.min_percentage,
        max: mat.max_percentage,
      });
    }
  }
  return [...byKey.values()];
}

/**
 * Leitet Haupt-/Nebenvorkommen eines Erzes an einer Location für eine
 * Methode aus den Wiki-Rock-Daten ab. Dominant ist das Material mit dem
 * höchsten max_percentage (Ties zugunsten des Erzes; keine Inert-Materialien
 * in den Wiki-Daten, live geprüft 2026-07-22). Unbekannte group_names und
 * nicht auf Erz-Codes mappbare dominante Materialien werden gemeldet, nie
 * geraten.
 */
export function deriveDepositInfo({
  entry,
  method,
  oreCodeByWikiKey,
}: {
  entry: ScWikiCommodityLocation;
  method: MiningMethod;
  oreCodeByWikiKey: Map<string, string>;
}): {
  info?: DepositInfo;
  unknownGroups: string[];
  unmappedDominantKeys: string[];
} {
  const unknownGroups = new Set<string>();
  const unmappedDominantKeys = new Set<string>();
  const relevant: ScWikiLocationResource[] = [];

  for (const resource of entry.resources ?? []) {
    const mappedMethod = resource.group_name
      ? WIKI_GROUP_TO_METHOD[resource.group_name]
      : undefined;
    if (!mappedMethod) {
      if (resource.group_name) unknownGroups.add(resource.group_name);
      continue;
    }
    if (mappedMethod === method) relevant.push(resource);
  }

  const rockBreakdown: RockBreakdownEntry[] = [];
  const byproductCodes = new Set<string>();
  let oreCode: string | undefined;
  let primaryRange: CompositionRange | undefined;
  let secondaryRange: CompositionRange | undefined;

  for (const resource of relevant) {
    const materials = mergeMaterialBands(resource);
    const current = materials.find((mat) => mat.isCurrent);
    if (!current) continue;

    oreCode ??= oreCodeByWikiKey.get(current.key);
    const resourceMax = Math.max(...materials.map((mat) => mat.max));
    const isPrimary = current.max >= resourceMax;
    const dominant = isPrimary
      ? current
      : materials.find((mat) => mat.max >= resourceMax && !mat.isCurrent);
    if (!dominant) continue;

    const dominantCode = oreCodeByWikiKey.get(dominant.key);
    if (!isPrimary) {
      if (dominantCode) byproductCodes.add(dominantCode);
      else unmappedDominantKeys.add(dominant.key);
    }

    const range = isPrimary ? primaryRange : secondaryRange;
    const next = range
      ? {
          min: Math.min(range.min, current.min),
          max: Math.max(range.max, current.max),
        }
      : { min: current.min, max: current.max };
    if (isPrimary) primaryRange = next;
    else secondaryRange = next;

    const breakdownEntry: RockBreakdownEntry = {
      rockLabel: resource.label ?? resource.key,
      isPrimary,
      oreCompositionPercent: { min: current.min, max: current.max },
      dominantMaterialName: dominant.name,
    };
    if (dominantCode) breakdownEntry.dominantMaterialOreCode = dominantCode;
    rockBreakdown.push(breakdownEntry);
  }

  if (rockBreakdown.length === 0) {
    return {
      unknownGroups: [...unknownGroups],
      unmappedDominantKeys: [...unmappedDominantKeys],
    };
  }

  const depositType: DepositType = primaryRange ? "primary" : "secondary";
  if (oreCode) byproductCodes.delete(oreCode);

  const info: DepositInfo = { depositType, rockBreakdown };
  const compositionPercent = primaryRange ?? secondaryRange;
  if (compositionPercent) info.compositionPercent = compositionPercent;
  if (depositType === "secondary" && byproductCodes.size > 0) {
    info.byproductOf = [...byproductCodes].sort();
  }

  return {
    info,
    unknownGroups: [...unknownGroups],
    unmappedDominantKeys: [...unmappedDominantKeys],
  };
}

/**
 * Mappt die Fundort-Liste eines Erzes auf Occurrence-Rows. Einträge ohne
 * auflösbare Location (weggefilterte Typen) oder ohne Wahrscheinlichkeit
 * werden gezählt und übersprungen. Mit oreCodeByWikiKey werden zusätzlich
 * Haupt-/Nebenvorkommen aus den Rock-Daten abgeleitet (Anreicherung —
 * die Zeilen-Kardinalität bleibt unverändert bei enabledMethods).
 */
export function mapWikiOccurrences({
  locations,
  ore,
  uuidMap,
  patchVersion,
  syncedAt,
  oreCodeByWikiKey,
}: {
  locations: ScWikiCommodityLocation[];
  ore: Ore;
  uuidMap: Map<string, { systemCode: string; slug: string }>;
  patchVersion: string;
  syncedAt: string;
  oreCodeByWikiKey?: Map<string, string>;
}): {
  occurrences: OreOccurrence[];
  skipped: number;
  unknownResourceGroups: string[];
  unmappedByproductKeys: string[];
} {
  const occurrences: OreOccurrence[] = [];
  let skipped = 0;
  const unknownResourceGroups = new Set<string>();
  const unmappedByproductKeys = new Set<string>();

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
      if (oreCodeByWikiKey) {
        const derived = deriveDepositInfo({
          entry,
          method,
          oreCodeByWikiKey,
        });
        for (const group of derived.unknownGroups) {
          unknownResourceGroups.add(group);
        }
        for (const key of derived.unmappedDominantKeys) {
          unmappedByproductKeys.add(key);
        }
        if (derived.info) {
          occurrence.depositType = derived.info.depositType;
          occurrence.rockBreakdown = derived.info.rockBreakdown;
          if (derived.info.compositionPercent) {
            occurrence.compositionPercent = derived.info.compositionPercent;
          }
          if (derived.info.byproductOf) {
            occurrence.byproductOf = derived.info.byproductOf;
          }
        }
      }
      occurrences.push(occurrence);
    }
  }

  return {
    occurrences,
    skipped,
    unknownResourceGroups: [...unknownResourceGroups],
    unmappedByproductKeys: [...unmappedByproductKeys],
  };
}
