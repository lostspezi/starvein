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
import { loadCuratedOres } from "@/features/ores/curated-ores";
import { upsertOres } from "@/features/ores/ores.repository";
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

  console.log(`Done (database '${db.databaseName}').`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
