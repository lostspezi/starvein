import type { Db } from "mongodb";
import { syncEquipmentPrices } from "@/features/loadouts/equipment-prices.sync";
import { captureDailyClose } from "@/features/price-ticker/daily-close.repository";
import { syncVehiclePrices } from "@/features/ships/vehicle-prices.sync";
import { findAllOres } from "@/features/ores/ores.repository";
import { getRedis } from "@/lib/redis";
import { uexClient } from "@/lib/uex-client";
import {
  priceSnapshotSchema,
  refineryMethodSchema,
  refineryYieldSchema,
} from "./refinery-and-prices.schema";
import { mapUexCommodity, type MappedCommodity } from "./uex-mapping";

export type SyncSummary = {
  prices: number;
  yields: number;
  methods: number;
  equipmentPrices: number;
  vehiclePrices: number;
  dailyCloses: number;
  syncedAt: string;
};

export const PRICE_CACHE_PREFIX = "prices:";

/**
 * Zieht Preise, Refinery-Yields und -Methoden von UEX, schreibt sie nach
 * MongoDB und invalidiert den Redis-Preis-Cache. Wird nie durch
 * User-Requests ausgelöst — nur per Cron/Route-Handler mit Secret
 * (CLAUDE.md §6.1).
 */
export async function syncUex(db: Db): Promise<SyncSummary> {
  const syncedAt = new Date().toISOString();

  const [ores, commodities, priceRecords, yieldRecords, methodRecords] =
    await Promise.all([
      findAllOres(db),
      uexClient.commodities(),
      uexClient.commodityPricesAll(),
      uexClient.refineryYields(),
      uexClient.refineryMethods(),
    ]);

  const knownCodes = new Set(ores.map((ore) => ore.code));
  const commodityMap = new Map<number, MappedCommodity>();
  for (const commodity of commodities) {
    const mapped = mapUexCommodity(commodity, knownCodes);
    if (mapped) commodityMap.set(commodity.id, mapped);
  }

  const snapshots = priceRecords.flatMap((record) => {
    const mapped = commodityMap.get(record.id_commodity);
    if (!mapped) return [];
    return [
      priceSnapshotSchema.parse({
        oreCode: mapped.oreCode,
        kind: mapped.kind,
        terminalId: record.id_terminal,
        terminalName: record.terminal_name,
        priceBuy: record.price_buy,
        priceSell: record.price_sell,
        syncedAt,
      }),
    ];
  });
  if (snapshots.length > 0) {
    await db.collection("priceSnapshots").bulkWrite(
      snapshots.map((snapshot) => ({
        updateOne: {
          filter: {
            oreCode: snapshot.oreCode,
            kind: snapshot.kind,
            terminalId: snapshot.terminalId,
          },
          update: { $set: snapshot },
          upsert: true,
        },
      })),
    );
  }

  const yields = yieldRecords.flatMap((record) => {
    const mapped = commodityMap.get(record.id_commodity);
    if (!mapped) return [];
    return [
      refineryYieldSchema.parse({
        oreCode: mapped.oreCode,
        terminalId: record.id_terminal,
        terminalName: record.terminal_name,
        starSystemName: record.star_system_name,
        bonusPercent: record.value,
        syncedAt,
      }),
    ];
  });
  if (yields.length > 0) {
    await db.collection("refineryYields").bulkWrite(
      yields.map((entry) => ({
        updateOne: {
          filter: { oreCode: entry.oreCode, terminalId: entry.terminalId },
          update: { $set: entry },
          upsert: true,
        },
      })),
    );
  }

  const methods = methodRecords.map((record) =>
    refineryMethodSchema.parse({
      code: record.code,
      name: record.name,
      ratingYield: record.rating_yield,
      ratingCost: record.rating_cost,
      ratingSpeed: record.rating_speed,
      syncedAt,
    }),
  );
  if (methods.length > 0) {
    await db.collection("refineryMethods").bulkWrite(
      methods.map((method) => ({
        updateOne: {
          filter: { code: method.code },
          update: { $set: method },
          upsert: true,
        },
      })),
    );
  }

  // Rolling Close für den Preisticker — muss nach dem Snapshot-Write laufen
  const dailyCloses = await captureDailyClose(db, syncedAt);

  const equipmentPrices = await syncEquipmentPrices(db, syncedAt);
  const vehiclePrices = await syncVehiclePrices(db, syncedAt);

  await db
    .collection("syncMeta")
    .updateOne(
      { key: "uex" },
      { $set: { key: "uex", syncedAt } },
      { upsert: true },
    );

  await invalidatePriceCache();

  return {
    prices: snapshots.length,
    yields: yields.length,
    methods: methods.length,
    equipmentPrices,
    vehiclePrices,
    dailyCloses,
    syncedAt,
  };
}

async function invalidatePriceCache(): Promise<void> {
  if (!process.env.REDIS_URL) return;
  try {
    const redis = getRedis();
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }
    const keys = await redis.keys(`${PRICE_CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Cache-Invalidierung ist best-effort — ohne Redis läuft der Sync trotzdem
  }
}
