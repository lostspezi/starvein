import type { Db } from "mongodb";
import { getRedis } from "@/lib/redis";
import { EQUIPMENT_PRICE_CACHE_PREFIX } from "./equipment-prices.sync";
import {
  equipmentPriceSchema,
  type EquipmentPrice,
} from "./equipment-prices.schema";

const COLLECTION = "equipmentPrices";
const CACHE_TTL_SECONDS = 900; // 15 min, wie beim Ore-Preis-Cache (CLAUDE.md §6.1)

export type EquipmentPurchaseData = {
  /** Pro Code preissortiert aufsteigend; unbekannte Codes fehlen. */
  byCode: Map<string, EquipmentPrice[]>;
  syncedAt: string | null;
};

export async function getEquipmentPurchasesByCodes(
  db: Db,
  codes: string[],
): Promise<EquipmentPurchaseData> {
  const docs = await db
    .collection(COLLECTION)
    .find({ equipmentCode: { $in: codes } }, { projection: { _id: 0 } })
    .sort({ priceBuy: 1, terminalName: 1 })
    .toArray();

  const byCode = new Map<string, EquipmentPrice[]>();
  for (const doc of docs) {
    const parsed = equipmentPriceSchema.parse(doc);
    const list = byCode.get(parsed.equipmentCode) ?? [];
    list.push(parsed);
    byCode.set(parsed.equipmentCode, list);
  }

  const meta = await db
    .collection("syncMeta")
    .findOne({ key: "uex" }, { projection: { _id: 0 } });
  const syncedAt = typeof meta?.syncedAt === "string" ? meta.syncedAt : null;

  return { byCode, syncedAt };
}

/**
 * Redis-gecachte Variante (ein Key pro Code-Set, Map als Entries
 * serialisiert). Bei Redis-Problemen direkter Mongo-Fallback — der
 * Read-Pfad fragt UEX nie live an.
 */
export async function getCachedEquipmentPurchasesByCodes(
  db: Db,
  codes: string[],
): Promise<EquipmentPurchaseData> {
  if (!process.env.REDIS_URL) {
    return getEquipmentPurchasesByCodes(db, codes);
  }

  const key = `${EQUIPMENT_PRICE_CACHE_PREFIX}${[...codes].sort().join(",")}`;
  try {
    const redis = getRedis();
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }

    const cached = await redis.get(key);
    if (cached) {
      const parsed = JSON.parse(cached) as {
        entries: [string, EquipmentPrice[]][];
        syncedAt: string | null;
      };
      return { byCode: new Map(parsed.entries), syncedAt: parsed.syncedAt };
    }

    const fresh = await getEquipmentPurchasesByCodes(db, codes);
    await redis.set(
      key,
      JSON.stringify({
        entries: [...fresh.byCode.entries()],
        syncedAt: fresh.syncedAt,
      }),
      "EX",
      CACHE_TTL_SECONDS,
    );
    return fresh;
  } catch {
    return getEquipmentPurchasesByCodes(db, codes);
  }
}
