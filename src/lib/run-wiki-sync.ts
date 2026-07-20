import type { Db } from "mongodb";
import {
  syncWikiBlueprints,
  type WikiSyncSummary,
} from "@/features/blueprints/blueprints.sync";
import {
  syncWikiLocations,
  type LocationsSyncSummary,
} from "@/features/locations/locations.sync";
import {
  collectResourceLocationUuids,
  fetchWikiMiningSnapshot,
  syncWikiMiningData,
  type MiningDataSyncSummary,
} from "@/features/ores/mining-data.sync";
import { coreIndexNowUrls, submitUrls } from "@/lib/indexnow";

export type FullWikiSyncSummary = {
  locations: LocationsSyncSummary;
  miningData: MiningDataSyncSummary;
  blueprints: WikiSyncSummary;
};

/**
 * Kompletter Star-Citizen-Wiki-Sync in fester Reihenfolge:
 * 0. Mining-Snapshot (Commodities + Fundort-Details, einmalig geladen),
 * 1. Locations (liefert die wikiUuid->Body-Map; der Snapshot rettet
 *    Asteroiden mit kaputtem has_resources-Flag über die Fundort-Referenzen),
 * 2. Mining-Daten (Erze, Vorkommen — braucht die Bodies, nutzt den Snapshot),
 * 3. Blueprints/Materials (braucht den Erz-Katalog für resolveOreCode).
 *
 * Genutzt von scripts/sync-wiki.ts und POST /api/sync-wiki.
 */
export async function runFullWikiSync(db: Db): Promise<FullWikiSyncSummary> {
  const snapshot = await fetchWikiMiningSnapshot();
  const locations = await syncWikiLocations(db, {
    resourceLocationUuids: collectResourceLocationUuids(snapshot),
  });
  const miningData = await syncWikiMiningData(db, snapshot);
  const blueprints = await syncWikiBlueprints(db);

  await db.collection("syncMeta").updateOne(
    { key: "scwiki" },
    {
      $set: {
        key: "scwiki",
        syncedAt: blueprints.syncedAt,
        gameVersion: miningData.gameVersion,
        counts: {
          bodies: locations.bodies,
          ores: miningData.ores,
          occurrences: miningData.occurrences,
          blueprints: blueprints.blueprints,
          materials: blueprints.materials,
        },
      },
    },
    { upsert: true },
  );

  // Bing/Yandex/DuckDuckGo sofort über die frischen Daten informieren.
  // submitUrls wirft nie und ist ohne INDEXNOW_KEY ein No-op.
  await submitUrls(coreIndexNowUrls());

  return { locations, miningData, blueprints };
}
