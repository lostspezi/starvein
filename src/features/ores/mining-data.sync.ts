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
import {
  scWikiClient,
  type ScWikiCommodity,
  type ScWikiCommodityDetail,
  type ScWikiGameVersion,
} from "@/lib/scwiki-client";
import { loadCuratedOreCodes } from "./curated-ore-codes";
import type { Ore } from "./ores.schema";
import {
  ensureOreIndexes,
  pruneOresNotIn,
  upsertOres,
} from "./ores.repository";
import { mapWikiCommodityToOre } from "./wiki-mapping";

/**
 * Vorab geladene Wiki-Mining-Daten: Commodity-Liste, Details (mit Fundorten)
 * und Default-Game-Version. Wird VOR dem Location-Sync geladen, damit die
 * referenzierten Location-UUIDs Asteroiden mit kaputtem has_resources-Flag
 * retten können — und die Detail-Requests nur einmal laufen.
 */
export type WikiMiningSnapshot = {
  commodities: ScWikiCommodity[];
  /** Details je Commodity-Slug — nur für kind="mineable". */
  details: Map<string, ScWikiCommodityDetail>;
  defaultVersion: ScWikiGameVersion;
};

/** Nur echte Minerale — Harvestables (Pflanzen, Pickups) sind keine Erze. */
function isMineralCommodity(commodity: ScWikiCommodity): boolean {
  return commodity.is_mineable && commodity.kind === "mineable";
}

export async function fetchWikiMiningSnapshot(): Promise<WikiMiningSnapshot> {
  const [commodities, defaultVersion] = await Promise.all([
    scWikiClient.commodities(),
    scWikiClient.defaultGameVersion(),
  ]);

  // Wahrscheinlichkeiten stehen nur im Detail-Endpunkt — sequenziell
  // (~40 Requests), um die API nicht zu hämmern.
  const details = new Map<string, ScWikiCommodityDetail>();
  for (const commodity of commodities.filter(isMineralCommodity)) {
    details.set(
      commodity.slug,
      await scWikiClient.commodityDetail(commodity.slug),
    );
  }

  return { commodities, details, defaultVersion };
}

/** Alle Location-UUIDs, an denen laut Snapshot ein Mineral vorkommt. */
export function collectResourceLocationUuids(
  snapshot: WikiMiningSnapshot,
): Set<string> {
  const uuids = new Set<string>();
  for (const detail of snapshot.details.values()) {
    for (const entry of detail.locations ?? []) {
      if (entry.group_probability_percent !== null) {
        uuids.add(entry.uuid);
      }
    }
  }
  return uuids;
}

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
  snapshot?: WikiMiningSnapshot,
): Promise<MiningDataSyncSummary> {
  const syncedAt = new Date().toISOString();

  const { commodities, details, defaultVersion } =
    snapshot ?? (await fetchWikiMiningSnapshot());
  const bodies = await findAllCelestialBodies(db);
  const byWikiKey = new Map(
    loadCuratedOreCodes().map((entry) => [entry.wikiKey, entry]),
  );

  const skippedUnmappedOres: string[] = [];
  const mapped: Array<{ commodity: ScWikiCommodity; ore: Ore }> = [];
  for (const commodity of commodities.filter(isMineralCommodity)) {
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

  const uuidMap = buildUuidToBodyMap(bodies);
  const rows: OreOccurrence[] = [];
  let skippedOccurrences = 0;
  for (const { commodity, ore } of mapped) {
    const detail = details.get(commodity.slug);
    const result = mapWikiOccurrences({
      locations: detail?.locations ?? [],
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
