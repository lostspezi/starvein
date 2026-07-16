import type { Db } from "mongodb";
import { getRedis } from "@/lib/redis";
import { uexClient, type UexVehiclePriceRecord } from "@/lib/uex-client";
import { buildLocationLabel } from "@/features/loadouts/equipment-uex-mapping";
import { findAllMiningVehicles } from "@/features/loadouts/equipment.repository";
import { mapUexVehicleSlug } from "./ships-uex-mapping";
import {
  vehiclePriceSchema,
  type OfferType,
  type VehiclePrice,
} from "./vehicle-prices.schema";

const COLLECTION = "vehiclePrices";

export const VEHICLE_PRICE_CACHE_PREFIX = "vehicle-prices:";

/**
 * Zieht Kauf- und Mietorte/-preise der kuratierten Mining-Fahrzeuge von UEX
 * (per-Vehicle-Endpunkte, siehe ships-uex-mapping.ts) und schreibt sie nach
 * MongoDB. Player-owned Terminals und Nullpreise werden verworfen,
 * verschwundene Terminals nach erfolgreichem Sync entfernt — der Prune läuft
 * je offerType, damit ein leerer Rental-Response nie die Kauforte wegwischt
 * (und umgekehrt). Wird von syncUex() mitgetrieben — kein eigener Cron.
 */
export async function syncVehiclePrices(
  db: Db,
  syncedAt: string,
): Promise<number> {
  const [catalog, uexVehicles] = await Promise.all([
    findAllMiningVehicles(db),
    uexClient.vehicles(),
  ]);

  const knownCodes = new Set(catalog.map((vehicle) => vehicle.code));
  const mapped: Array<{ uexId: number; code: string }> = [];
  const matchedCodes = new Set<string>();
  for (const vehicle of uexVehicles) {
    const code = mapUexVehicleSlug(vehicle.slug, knownCodes);
    if (!code) continue;
    mapped.push({ uexId: vehicle.id, code });
    matchedCodes.add(code);
  }
  for (const code of knownCodes) {
    if (!matchedCodes.has(code)) {
      console.warn(
        `syncVehiclePrices: kein UEX-Vehicle für kuratierten Code "${code}" — Slug-Map in ships-uex-mapping.ts prüfen`,
      );
    }
  }

  const perVehicle = await Promise.all(
    mapped.map(async ({ uexId, code }) => {
      const [purchases, rentals] = await Promise.all([
        uexClient.vehiclePurchasePrices(uexId),
        uexClient.vehicleRentalPrices(uexId),
      ]);
      return { code, purchases, rentals };
    }),
  );

  const toSnapshot = (
    code: string,
    offerType: OfferType,
    record: UexVehiclePriceRecord,
  ): VehiclePrice[] => {
    const price =
      offerType === "purchase" ? record.price_buy : record.price_rent;
    if (!price || price <= 0 || record.terminal_is_player_owned === 1) {
      return [];
    }
    return [
      vehiclePriceSchema.parse({
        vehicleCode: code,
        offerType,
        terminalId: record.id_terminal,
        terminalName: record.terminal_name,
        locationLabel: buildLocationLabel(record),
        starSystemName: record.star_system_name,
        price,
        syncedAt,
      }),
    ];
  };

  const snapshots: VehiclePrice[] = perVehicle.flatMap(
    ({ code, purchases, rentals }) => [
      ...purchases.flatMap((record) => toSnapshot(code, "purchase", record)),
      ...rentals.flatMap((record) => toSnapshot(code, "rental", record)),
    ],
  );

  if (snapshots.length > 0) {
    await db.collection(COLLECTION).bulkWrite(
      snapshots.map((snapshot) => ({
        updateOne: {
          filter: {
            vehicleCode: snapshot.vehicleCode,
            offerType: snapshot.offerType,
            terminalId: snapshot.terminalId,
          },
          update: { $set: snapshot },
          upsert: true,
        },
      })),
    );
    // Nur nach erfolgreichem Sync und je offerType: Terminals entfernen, die
    // UEX nicht mehr führt — eine leere/kaputte Antwort für einen der beiden
    // Angebotstypen wischt nie die Dokumente des anderen (oder alle) weg
    for (const offerType of ["purchase", "rental"] as const) {
      if (snapshots.some((snapshot) => snapshot.offerType === offerType)) {
        await db
          .collection(COLLECTION)
          .deleteMany({ offerType, syncedAt: { $ne: syncedAt } });
      }
    }
  }

  await invalidateVehiclePriceCache();

  return snapshots.length;
}

async function invalidateVehiclePriceCache(): Promise<void> {
  if (!process.env.REDIS_URL) return;
  try {
    const redis = getRedis();
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }
    const keys = await redis.keys(`${VEHICLE_PRICE_CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Cache-Invalidierung ist best-effort — ohne Redis läuft der Sync trotzdem
  }
}
