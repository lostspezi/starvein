import type { Db } from "mongodb";
import { getRedis } from "@/lib/redis";
import { VEHICLE_PRICE_CACHE_PREFIX } from "./vehicle-prices.sync";
import { vehiclePriceSchema, type VehiclePrice } from "./vehicle-prices.schema";

const COLLECTION = "vehiclePrices";
const CACHE_TTL_SECONDS = 900; // 15 min, wie beim Ore-Preis-Cache (CLAUDE.md §6.1)

export type VehicleOffers = {
  /** Preissortiert aufsteigend. */
  purchase: VehiclePrice[];
  rental: VehiclePrice[];
};

export type VehicleOffersData = {
  /** Pro Code Kauf-/Mietangebote; unbekannte Codes fehlen. */
  byCode: Map<string, VehicleOffers>;
  syncedAt: string | null;
};

export async function getVehicleOffersByCodes(
  db: Db,
  codes: string[],
): Promise<VehicleOffersData> {
  const docs = await db
    .collection(COLLECTION)
    .find({ vehicleCode: { $in: codes } }, { projection: { _id: 0 } })
    .sort({ price: 1, terminalName: 1 })
    .toArray();

  const byCode = new Map<string, VehicleOffers>();
  for (const doc of docs) {
    const parsed = vehiclePriceSchema.parse(doc);
    const offers = byCode.get(parsed.vehicleCode) ?? {
      purchase: [],
      rental: [],
    };
    offers[parsed.offerType].push(parsed);
    byCode.set(parsed.vehicleCode, offers);
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
export async function getCachedVehicleOffersByCodes(
  db: Db,
  codes: string[],
): Promise<VehicleOffersData> {
  if (!process.env.REDIS_URL) {
    return getVehicleOffersByCodes(db, codes);
  }

  const key = `${VEHICLE_PRICE_CACHE_PREFIX}${[...codes].sort().join(",")}`;
  try {
    const redis = getRedis();
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }

    const cached = await redis.get(key);
    if (cached) {
      const parsed = JSON.parse(cached) as {
        entries: [string, VehicleOffers][];
        syncedAt: string | null;
      };
      return { byCode: new Map(parsed.entries), syncedAt: parsed.syncedAt };
    }

    const fresh = await getVehicleOffersByCodes(db, codes);
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
    return getVehicleOffersByCodes(db, codes);
  }
}
