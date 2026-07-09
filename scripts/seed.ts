/**
 * Spielt die kuratierten Seed-Daten (data/curated/*.json) nach MongoDB ein.
 * Aufruf: pnpm seed (lädt .env.local über tsx --env-file)
 */
import { loadCuratedOres } from "@/features/ores/curated-ores";
import { upsertOres } from "@/features/ores/ores.repository";
import { closeMongo, getDb } from "@/lib/db";

async function main() {
  const ores = loadCuratedOres();
  const db = await getDb();
  await upsertOres(db, ores);
  console.log(`Seeded ${ores.length} ores into '${db.databaseName}'.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
