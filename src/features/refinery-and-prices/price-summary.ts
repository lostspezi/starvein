import type { Db } from "mongodb";
import { getRedis } from "@/lib/redis";
import {
  priceSnapshotSchema,
  refineryYieldSchema,
  type PriceSnapshot,
  type RefineryYield,
} from "./refinery-and-prices.schema";
import { PRICE_CACHE_PREFIX } from "./sync.service";

const CACHE_TTL_SECONDS = 900; // 15 Minuten (CLAUDE.md §6.1)
const TOP_TERMINALS = 5;

export type PriceSide = {
  bestSell: PriceSnapshot | null;
  topSellTerminals: PriceSnapshot[];
};

export type OrePriceSummary = {
  raw: PriceSide | null;
  refined: PriceSide | null;
  syncedAt: string | null;
};

function buildSide(snapshots: PriceSnapshot[]): PriceSide | null {
  const sellable = snapshots
    .filter((s) => s.priceSell > 0)
    .sort((a, b) => b.priceSell - a.priceSell);
  if (sellable.length === 0) return null;

  return {
    bestSell: sellable[0],
    topSellTerminals: sellable.slice(0, TOP_TERMINALS),
  };
}

/** Preis-Zusammenfassung direkt aus MongoDB. */
export async function getOrePriceSummary(
  db: Db,
  oreCode: string,
): Promise<OrePriceSummary> {
  const docs = await db
    .collection("priceSnapshots")
    .find({ oreCode }, { projection: { _id: 0 } })
    .toArray();
  const snapshots = docs.map((doc) => priceSnapshotSchema.parse(doc));

  const meta = await db.collection("syncMeta").findOne({ key: "uex" });

  return {
    raw: buildSide(snapshots.filter((s) => s.kind === "raw")),
    refined: buildSide(snapshots.filter((s) => s.kind === "refined")),
    syncedAt: typeof meta?.syncedAt === "string" ? meta.syncedAt : null,
  };
}

/**
 * Bester Verkaufspreis (raffiniert) je Erz in einem Roundtrip — für den
 * Startseiten-Explorer. Leere Map, solange nie gesynct wurde.
 */
export async function getBestRefinedSellByOre(
  db: Db,
): Promise<Map<string, number>> {
  const results = await db
    .collection("priceSnapshots")
    .aggregate<{ _id: string; best: number }>([
      { $match: { kind: "refined", priceSell: { $gt: 0 } } },
      { $group: { _id: "$oreCode", best: { $max: "$priceSell" } } },
    ])
    .toArray();

  return new Map(results.map((entry) => [entry._id, entry.best]));
}

export type BestSellPrices = {
  raw: number | null;
  refined: number | null;
};

/**
 * Bester Verkaufspreis (roh UND raffiniert) je Erz in einem Roundtrip —
 * für Tabellen, die beide Werte zeigen. Erze ohne verkaufbaren Snapshot
 * fehlen in der Map.
 */
export async function getBestSellByOre(
  db: Db,
): Promise<Map<string, BestSellPrices>> {
  const results = await db
    .collection("priceSnapshots")
    .aggregate<{ _id: { oreCode: string; kind: string }; best: number }>([
      { $match: { priceSell: { $gt: 0 } } },
      {
        $group: {
          _id: { oreCode: "$oreCode", kind: "$kind" },
          best: { $max: "$priceSell" },
        },
      },
    ])
    .toArray();

  const map = new Map<string, BestSellPrices>();
  for (const entry of results) {
    const prices = map.get(entry._id.oreCode) ?? { raw: null, refined: null };
    if (entry._id.kind === "raw") prices.raw = entry.best;
    if (entry._id.kind === "refined") prices.refined = entry.best;
    map.set(entry._id.oreCode, prices);
  }
  return map;
}

export async function findRefineryYieldsByOre(
  db: Db,
  oreCode: string,
): Promise<RefineryYield[]> {
  const docs = await db
    .collection("refineryYields")
    .find({ oreCode }, { projection: { _id: 0 } })
    .sort({ bonusPercent: -1, terminalName: 1 })
    .toArray();
  return docs.map((doc) => refineryYieldSchema.parse(doc));
}

/**
 * Read-Pfad mit Redis davor (kurze TTL); bei Cache-Miss oder Redis-Ausfall
 * fällt er auf MongoDB zurück. UEX wird hier nie live angefragt.
 */
export async function getCachedOrePriceSummary(
  db: Db,
  oreCode: string,
): Promise<OrePriceSummary> {
  const cacheKey = `${PRICE_CACHE_PREFIX}${oreCode}`;

  if (process.env.REDIS_URL) {
    try {
      const redis = getRedis();
      if (redis.status === "wait" || redis.status === "end") {
        await redis.connect();
      }
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as OrePriceSummary;
      }
      const summary = await getOrePriceSummary(db, oreCode);
      await redis.set(
        cacheKey,
        JSON.stringify(summary),
        "EX",
        CACHE_TTL_SECONDS,
      );
      return summary;
    } catch {
      // Redis nicht erreichbar — direkt aus MongoDB bedienen
    }
  }

  return getOrePriceSummary(db, oreCode);
}
