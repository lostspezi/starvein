import type { Db } from "mongodb";
import { scWikiClient } from "@/lib/scwiki-client";
import { celestialBodySchema, type CelestialBody } from "./locations.schema";
import {
  ensureCelestialBodyIndexes,
  findAllStarSystems,
  pruneCelestialBodiesNotIn,
  upsertCelestialBodies,
} from "./locations.repository";
import { dropOrphanParents, mapWikiLocation } from "./wiki-mapping";

export type LocationsSyncSummary = {
  bodies: number;
  skipped: number;
  pruned: number;
  syncedAt: string;
};

/**
 * Synct mining-relevante Starmap-Locations vom Star Citizen Wiki nach
 * `celestialBodies`. Die Collection ist danach vollständig wiki-geführt:
 * pro bekanntem System wird alles entfernt, was der Sync nicht liefert.
 *
 * Muss vor dem Mining-Data-Sync laufen (liefert die wikiUuid->Body-Map).
 * Nie user-getriggert, nur Cron/Route-Handler mit Secret (CLAUDE.md §6.1).
 */
export async function syncWikiLocations(db: Db): Promise<LocationsSyncSummary> {
  const syncedAt = new Date().toISOString();

  const [wikiLocations, systems] = await Promise.all([
    scWikiClient.locations(),
    findAllStarSystems(db),
  ]);
  const knownSystemCodes = new Set(systems.map((system) => system.code));

  const mapped = wikiLocations
    .map((location) => mapWikiLocation(location, knownSystemCodes))
    .filter((body): body is CelestialBody => body !== null);

  // Defensive Validierung: fehlerhafte Wiki-Slugs sollen den Sync nicht kippen.
  const bodies = dropOrphanParents(mapped).filter(
    (body) => celestialBodySchema.safeParse(body).success,
  );

  await upsertCelestialBodies(db, bodies);
  await ensureCelestialBodyIndexes(db);

  let pruned = 0;
  for (const systemCode of knownSystemCodes) {
    pruned += await pruneCelestialBodiesNotIn(
      db,
      systemCode,
      bodies
        .filter((body) => body.systemCode === systemCode)
        .map((body) => body.slug),
    );
  }

  return {
    bodies: bodies.length,
    skipped: wikiLocations.length - bodies.length,
    pruned,
    syncedAt,
  };
}
