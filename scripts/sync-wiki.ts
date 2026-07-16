/**
 * Manueller/Cron-Sync gegen die Star Citizen Wiki API: Locations, Erze,
 * Signaturen, Vorkommen, Blueprints. Aufruf: pnpm sync:wiki
 * (lädt .env.local über tsx --env-file)
 *
 * Bewusst getrennt vom UEX-Sync: andere Quelle, anderer Ausfallpfad — ein
 * UEX-Ausfall darf den Wiki-Sync nicht blockieren und umgekehrt.
 */
import { runFullWikiSync } from "@/lib/run-wiki-sync";
import { closeMongo, getDb } from "@/lib/db";

async function main() {
  const db = await getDb();
  const { locations, miningData, blueprints } = await runFullWikiSync(db);

  console.log(
    `Locations: ${locations.bodies} bodies (skipped ${locations.skipped}, pruned ${locations.pruned}).`,
  );
  console.log(
    `Mining data (${miningData.gameVersion}): ${miningData.ores} ores, ` +
      `${miningData.occurrences} occurrences ` +
      `(skipped ${miningData.skippedOccurrences}, pruned ${miningData.prunedOccurrences}).`,
  );
  if (miningData.skippedUnmappedOres.length > 0) {
    console.warn(
      `Unmapped wiki mineables (extend data/curated/ore-codes.json): ` +
        miningData.skippedUnmappedOres.join(", "),
    );
  }
  console.log(
    `Blueprints: ${blueprints.blueprints} blueprints, ${blueprints.materials} materials ` +
      `(skipped ${blueprints.skippedBlueprints}, pruned ${blueprints.prunedBlueprints}/${blueprints.prunedMaterials}).`,
  );
}

main()
  .catch((error) => {
    console.error("SC Wiki sync failed:", error);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
