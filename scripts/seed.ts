/**
 * Spielt die kuratierten Seed-Daten (data/curated/*.json) nach MongoDB ein.
 * Aufruf: pnpm seed (lädt .env.local über tsx --env-file)
 */
import {
  loadCuratedCelestialBodies,
  loadCuratedStarSystems,
} from "@/features/locations/curated-locations";
import {
  upsertCelestialBodies,
  upsertStarSystems,
} from "@/features/locations/locations.repository";
import { loadCuratedOccurrences } from "@/features/ore-occurrences/curated-occurrences";
import { upsertOreOccurrences } from "@/features/ore-occurrences/ore-occurrences.repository";
import { loadCuratedOres } from "@/features/ores/curated-ores";
import { upsertOres } from "@/features/ores/ores.repository";
import { loadCuratedSignatureProfiles } from "@/features/signature-profiles/curated-signatures";
import { upsertSignatureProfiles } from "@/features/signature-profiles/signature-profiles.repository";
import { closeMongo, getDb } from "@/lib/db";

async function main() {
  const db = await getDb();

  const ores = loadCuratedOres();
  await upsertOres(db, ores);
  console.log(`Seeded ${ores.length} ores`);

  const systems = loadCuratedStarSystems();
  await upsertStarSystems(db, systems);
  console.log(`Seeded ${systems.length} star systems`);

  const bodies = loadCuratedCelestialBodies();
  await upsertCelestialBodies(db, bodies);
  console.log(`Seeded ${bodies.length} celestial bodies`);

  const occurrences = loadCuratedOccurrences();
  await upsertOreOccurrences(db, occurrences);
  console.log(`Seeded ${occurrences.length} ore occurrences`);

  const signatureProfiles = loadCuratedSignatureProfiles();
  await upsertSignatureProfiles(db, signatureProfiles);
  console.log(`Seeded ${signatureProfiles.length} signature profiles`);

  console.log(`Done (database '${db.databaseName}').`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
