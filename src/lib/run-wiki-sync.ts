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
  syncWikiMiningData,
  type MiningDataSyncSummary,
} from "@/features/ores/mining-data.sync";

export type FullWikiSyncSummary = {
  locations: LocationsSyncSummary;
  miningData: MiningDataSyncSummary;
  blueprints: WikiSyncSummary;
};

/**
 * Kompletter Star-Citizen-Wiki-Sync in fester Reihenfolge:
 * 1. Locations (liefert die wikiUuid->Body-Map),
 * 2. Mining-Daten (Erze, Signaturen, Vorkommen — braucht die Bodies),
 * 3. Blueprints/Materials (braucht den Erz-Katalog für resolveOreCode).
 *
 * Genutzt von scripts/sync-wiki.ts und POST /api/sync-wiki.
 */
export async function runFullWikiSync(db: Db): Promise<FullWikiSyncSummary> {
  const locations = await syncWikiLocations(db);
  const miningData = await syncWikiMiningData(db);
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

  return { locations, miningData, blueprints };
}
