/**
 * Manueller/Cron-Sync der Crafting-Blueprints gegen die Star Citizen Wiki API.
 * Aufruf: pnpm sync:wiki (lädt .env.local über tsx --env-file)
 *
 * Bewusst getrennt vom UEX-Sync: andere Quelle, anderer Ausfallpfad — ein
 * UEX-Ausfall darf den Blueprint-Sync nicht blockieren und umgekehrt.
 */
import { syncWikiBlueprints } from "@/features/blueprints/blueprints.sync";
import { closeMongo, getDb } from "@/lib/db";

async function main() {
  const db = await getDb();
  const summary = await syncWikiBlueprints(db);
  console.log(
    `Synced ${summary.blueprints} blueprints and ${summary.materials} materials ` +
      `for ${summary.gameVersion} at ${summary.syncedAt} ` +
      `(skipped ${summary.skippedBlueprints}, pruned ${summary.prunedBlueprints} blueprints / ${summary.prunedMaterials} materials).`,
  );
}

main()
  .catch((error) => {
    console.error("SC Wiki sync failed:", error);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
