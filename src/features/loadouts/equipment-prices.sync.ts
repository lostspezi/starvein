import type { Db } from "mongodb";
import { getRedis } from "@/lib/redis";
import { uexClient } from "@/lib/uex-client";
import {
  equipmentPriceSchema,
  EQUIPMENT_KINDS,
  type EquipmentKind,
  type EquipmentPrice,
} from "./equipment-prices.schema";
import {
  buildLocationLabel,
  mapUexItemSlug,
  UEX_EQUIPMENT_CATEGORIES,
} from "./equipment-uex-mapping";
import { loadEquipmentCatalog } from "./equipment.repository";

const COLLECTION = "equipmentPrices";

export const EQUIPMENT_PRICE_CACHE_PREFIX = "equip-prices:";

/**
 * Zieht Kauforte/Preise für Mining-Laser, -Module und -Gadgets von UEX
 * (items + items_prices je Kategorie, Join über id_item) und schreibt sie
 * nach MongoDB. Player-owned Terminals und Nullpreise werden verworfen,
 * verschwundene Terminals nach erfolgreichem Sync entfernt. Wird von
 * syncUex() mitgetrieben — kein eigener Cron.
 */
export async function syncEquipmentPrices(
  db: Db,
  syncedAt: string,
): Promise<number> {
  const [catalog, ...perKind] = await Promise.all([
    loadEquipmentCatalog(db),
    ...EQUIPMENT_KINDS.map(async (kind) => {
      const categoryId = UEX_EQUIPMENT_CATEGORIES[kind];
      const [items, prices] = await Promise.all([
        uexClient.items(categoryId),
        uexClient.itemPrices(categoryId),
      ]);
      return { kind, items, prices };
    }),
  ]);

  const knownCodesByKind: Record<EquipmentKind, Set<string>> = {
    laser: new Set(catalog.lasers.map((l) => l.code)),
    module: new Set(catalog.modules.map((m) => m.code)),
    gadget: new Set(catalog.gadgets.map((g) => g.code)),
  };

  const snapshots: EquipmentPrice[] = perKind.flatMap(
    ({ kind, items, prices }) => {
      const codeByItemId = new Map<number, string>();
      for (const item of items) {
        const code = mapUexItemSlug(item.slug, kind, knownCodesByKind[kind]);
        if (code) codeByItemId.set(item.id, code);
      }

      return prices.flatMap((record) => {
        const code = codeByItemId.get(record.id_item);
        if (
          !code ||
          record.price_buy <= 0 ||
          record.terminal_is_player_owned === 1
        ) {
          return [];
        }
        return [
          equipmentPriceSchema.parse({
            equipmentCode: code,
            kind,
            terminalId: record.id_terminal,
            terminalName: record.terminal_name,
            locationLabel: buildLocationLabel(record),
            priceBuy: record.price_buy,
            syncedAt,
          }),
        ];
      });
    },
  );

  if (snapshots.length > 0) {
    await db.collection(COLLECTION).bulkWrite(
      snapshots.map((snapshot) => ({
        updateOne: {
          filter: {
            equipmentCode: snapshot.equipmentCode,
            kind: snapshot.kind,
            terminalId: snapshot.terminalId,
          },
          update: { $set: snapshot },
          upsert: true,
        },
      })),
    );
    // Nur nach erfolgreichem Sync: Terminals entfernen, die UEX nicht mehr
    // führt — eine leere/kaputte Antwort wischt die Collection nie
    await db.collection(COLLECTION).deleteMany({ syncedAt: { $ne: syncedAt } });
  }

  await invalidateEquipmentPriceCache();

  return snapshots.length;
}

async function invalidateEquipmentPriceCache(): Promise<void> {
  if (!process.env.REDIS_URL) return;
  try {
    const redis = getRedis();
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }
    const keys = await redis.keys(`${EQUIPMENT_PRICE_CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Cache-Invalidierung ist best-effort — ohne Redis läuft der Sync trotzdem
  }
}
