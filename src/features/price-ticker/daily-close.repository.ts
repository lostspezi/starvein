import type { Db } from "mongodb";
import { getBestRefinedSellByOre } from "@/features/refinery-and-prices/price-summary";
import { priceDailyCloseSchema } from "./price-ticker.schema";

const COLLECTION = "priceDailyCloses";
const RETENTION_DAYS = 30;

export async function ensurePriceDailyCloseIndexes(db: Db): Promise<void> {
  await db
    .collection(COLLECTION)
    .createIndex({ oreCode: 1, date: 1 }, { unique: true });
}

/**
 * Rolling Close: hält pro Erz und UTC-Kalendertag den besten Refined-Sell
 * aus den aktuellen priceSnapshots fest. Läuft nach jedem UEX-Sync — der
 * letzte Sync vor Mitternacht ist damit automatisch der Tagesschluss.
 * Räumt gleichzeitig Closes außerhalb der Retention ab.
 */
export async function captureDailyClose(
  db: Db,
  syncedAt: string,
): Promise<number> {
  await ensurePriceDailyCloseIndexes(db);

  const date = syncedAt.slice(0, 10);
  const bestByOre = await getBestRefinedSellByOre(db);

  const closes = [...bestByOre.entries()].map(([oreCode, bestSell]) =>
    priceDailyCloseSchema.parse({ oreCode, date, bestSell, syncedAt }),
  );
  if (closes.length > 0) {
    await db.collection(COLLECTION).bulkWrite(
      closes.map((close) => ({
        updateOne: {
          filter: { oreCode: close.oreCode, date: close.date },
          update: { $set: close },
          upsert: true,
        },
      })),
    );
  }

  const cutoff = new Date(
    new Date(syncedAt).getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);
  await db.collection(COLLECTION).deleteMany({ date: { $lt: cutoff } });

  return closes.length;
}

/**
 * Vortagesreferenz je Erz: der jüngste Close mit Datum strikt vor `today`.
 * Bleibt dadurch tagsüber stabil und fällt bei Sync-Lücken auf den letzten
 * bekannten Wert zurück; leere Map bei Cold-Start.
 */
export async function getPreviousDayCloses(
  db: Db,
  today: string,
): Promise<Map<string, number>> {
  const results = await db
    .collection(COLLECTION)
    .aggregate<{ _id: string; bestSell: number }>([
      { $match: { date: { $lt: today } } },
      { $sort: { date: -1 } },
      { $group: { _id: "$oreCode", bestSell: { $first: "$bestSell" } } },
    ])
    .toArray();

  return new Map(results.map((entry) => [entry._id, entry.bestSell]));
}
