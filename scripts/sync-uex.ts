/**
 * Manueller/Cron-Sync gegen die UEX API.
 * Aufruf: pnpm sync:uex (lädt .env.local über tsx --env-file)
 */
import { syncUex } from "@/features/refinery-and-prices/sync.service";
import { closeMongo, getDb } from "@/lib/db";
import { closeRedis } from "@/lib/redis";

async function main() {
  const db = await getDb();
  const summary = await syncUex(db);
  console.log(
    `Synced ${summary.prices} prices, ${summary.yields} yields, ${summary.methods} methods, ${summary.equipmentPrices} equipment prices, ${summary.vehiclePrices} vehicle prices at ${summary.syncedAt}.`,
  );
}

main()
  .catch((error) => {
    console.error("UEX sync failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeRedis();
    await closeMongo();
  });
