import type { Db } from "mongodb";
import { findAllCelestialBodies } from "@/features/locations/locations.repository";
import {
  ensureOreOccurrenceIndexes,
  pruneOreOccurrencesNotSyncedAt,
  upsertOreOccurrences,
} from "@/features/ore-occurrences/ore-occurrences.repository";
import type { OreOccurrence } from "@/features/ore-occurrences/ore-occurrences.schema";
import {
  buildUuidToBodyMap,
  mapWikiOccurrences,
  shortGameVersion,
} from "@/features/ore-occurrences/wiki-mapping";
import { scWikiClient, type ScWikiCommodity } from "@/lib/scwiki-client";
import { loadCuratedOreCodes } from "./curated-ore-codes";
import type { Ore } from "./ores.schema";
import {
  ensureOreIndexes,
  pruneOresNotIn,
  upsertOres,
} from "./ores.repository";
import { mapWikiCommodityToOre } from "./wiki-mapping";

export type MiningDataSyncSummary = {
  gameVersion: string;
  patchVersion: string;
  ores: number;
  prunedOres: number;
  /** Wiki-Mineables ohne Eintrag in data/curated/ore-codes.json. */
  skippedUnmappedOres: string[];
  occurrences: number;
  skippedOccurrences: number;
  prunedOccurrences: number;
  syncedAt: string;
};

/**
 * Synct den Mining-Kern aus den Wiki-Spieldaten: Erz-Katalog und
 * Fundort-Wahrscheinlichkeiten. Locations müssen vorher gesynct sein
 * (uuid->Body-Join). Nie user-getriggert (CLAUDE.md §6.1).
 *
 * Bewusst NICHT gesynct: signatureProfiles. Das signature-Feld der Wiki-API
 * entspricht nicht dem In-Game-Scanner-RS-Wert (community-verifiziert via
 * sc-mining-hud + Rock Syndicate) — die kuratierte Tabelle ist maßgeblich.
 */
export async function syncWikiMiningData(
  db: Db,
): Promise<MiningDataSyncSummary> {
  const syncedAt = new Date().toISOString();

  const [commodities, defaultVersion, bodies] = await Promise.all([
    scWikiClient.commodities(),
    scWikiClient.defaultGameVersion(),
    findAllCelestialBodies(db),
  ]);
  const byWikiKey = new Map(
    loadCuratedOreCodes().map((entry) => [entry.wikiKey, entry]),
  );

  const skippedUnmappedOres: string[] = [];
  const mapped: Array<{ commodity: ScWikiCommodity; ore: Ore }> = [];
  for (const commodity of commodities.filter((c) => c.is_mineable)) {
    const mapping = byWikiKey.get(commodity.key);
    const ore = mapping ? mapWikiCommodityToOre(commodity, mapping) : null;
    if (!ore) {
      skippedUnmappedOres.push(commodity.key);
      continue;
    }
    mapped.push({ commodity, ore });
  }

  await upsertOres(
    db,
    mapped.map(({ ore }) => ore),
  );
  await ensureOreIndexes(db);
  const prunedOres = await pruneOresNotIn(
    db,
    mapped.map(({ ore }) => ore.code),
  );

  const patchVersion = shortGameVersion(defaultVersion.code);

  // Wahrscheinlichkeiten stehen nur im Detail-Endpunkt — sequenziell
  // (~40 Requests), um die API nicht zu hämmern.
  const uuidMap = buildUuidToBodyMap(bodies);
  const rows: OreOccurrence[] = [];
  let skippedOccurrences = 0;
  for (const { commodity, ore } of mapped) {
    const detail = await scWikiClient.commodityDetail(commodity.slug);
    const result = mapWikiOccurrences({
      locations: detail.locations ?? [],
      ore,
      uuidMap,
      patchVersion,
      syncedAt,
    });
    rows.push(...result.occurrences);
    skippedOccurrences += result.skipped;
  }

  await upsertOreOccurrences(db, rows);
  const prunedOccurrences = await pruneOreOccurrencesNotSyncedAt(db, syncedAt);
  await ensureOreOccurrenceIndexes(db);

  return {
    gameVersion: defaultVersion.code,
    patchVersion,
    ores: mapped.length,
    prunedOres,
    skippedUnmappedOres,
    occurrences: rows.length,
    skippedOccurrences,
    prunedOccurrences,
    syncedAt,
  };
}
