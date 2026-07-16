import type { Db } from "mongodb";
import { PRICE_CACHE_PREFIX } from "@/features/refinery-and-prices/sync.service";
import { getRedis } from "@/lib/redis";
import { getPreviousDayCloses } from "./daily-close.repository";

const CACHE_TTL_SECONDS = 900; // 15 Minuten (CLAUDE.md §6.1)
// Versionssuffix bei JEDER Änderung an der TickerEntry-Form mitziehen:
// nach einem Deploy liegt sonst bis zu TTL/Sync-Invalidierung die alte
// Form im Cache und crasht den Client (Prod-Vorfall 2026-07-16).
const TICKER_CACHE_KEY = `${PRICE_CACHE_PREFIX}ticker:v2`;
const MAX_SELL_TERMINALS = 5;

export type TickerEntry = {
  oreCode: string;
  nameDe: string;
  nameEn: string;
  bestSell: number;
  prevClose: number | null;
  direction: "up" | "down" | "same" | null;
  changePercent: number | null;
  /** Terminals mit dem Bestpreis, alphabetisch, max. MAX_SELL_TERMINALS */
  sellTerminals: string[];
  /** Gesamtzahl der Terminals mit dem Bestpreis (für "+N weitere") */
  sellTerminalCount: number;
};

type BestSellWithTerminals = {
  best: number;
  terminals: string[];
  terminalCount: number;
};

/**
 * Wie getBestRefinedSellByOre, aber inklusive der Terminals, die den
 * Bestpreis zahlen — für den Verkaufsort-Tooltip im Ticker.
 */
async function getBestRefinedSellWithTerminals(
  db: Db,
): Promise<Map<string, BestSellWithTerminals>> {
  const results = await db
    .collection("priceSnapshots")
    .aggregate<{
      _id: string;
      best: number;
      offers: { name: string; price: number }[];
    }>([
      { $match: { kind: "refined", priceSell: { $gt: 0 } } },
      {
        $group: {
          _id: "$oreCode",
          best: { $max: "$priceSell" },
          offers: { $push: { name: "$terminalName", price: "$priceSell" } },
        },
      },
    ])
    .toArray();

  return new Map(
    results.map((entry) => {
      const atBest = entry.offers
        .filter((offer) => offer.price === entry.best)
        .map((offer) => offer.name)
        .sort((a, b) => a.localeCompare(b));
      return [
        entry._id,
        {
          best: entry.best,
          terminals: atBest.slice(0, MAX_SELL_TERMINALS),
          terminalCount: atBest.length,
        },
      ];
    }),
  );
}

function toDirection(
  bestSell: number,
  prevClose: number | null,
): TickerEntry["direction"] {
  if (prevClose === null) return null;
  if (bestSell > prevClose) return "up";
  if (bestSell < prevClose) return "down";
  return "same";
}

/**
 * Ticker-Zeilen: bester Refined-Sell je Erz plus Vortagesvergleich. Beide
 * Sprachnamen werden mitgeliefert, der Client wählt per Locale — so reicht
 * ein Cache-Eintrag für beide Locales.
 */
export async function getTickerEntries(
  db: Db,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<TickerEntry[]> {
  const [bestByOre, prevCloses, ores] = await Promise.all([
    getBestRefinedSellWithTerminals(db),
    getPreviousDayCloses(db, today),
    db
      .collection("ores")
      .find({}, { projection: { _id: 0, code: 1, name_de: 1, name_en: 1 } })
      .toArray(),
  ]);
  const namesByCode = new Map(
    ores.map((ore) => [
      ore.code as string,
      { nameDe: ore.name_de as string, nameEn: ore.name_en as string },
    ]),
  );

  const entries: TickerEntry[] = [];
  for (const [oreCode, { best, terminals, terminalCount }] of bestByOre) {
    const names = namesByCode.get(oreCode);
    if (!names) continue;

    const prevClose = prevCloses.get(oreCode) ?? null;
    entries.push({
      oreCode,
      nameDe: names.nameDe,
      nameEn: names.nameEn,
      bestSell: best,
      prevClose,
      direction: toDirection(best, prevClose),
      changePercent:
        prevClose === null
          ? null
          : Math.round(((best - prevClose) / prevClose) * 1000) / 10,
      sellTerminals: terminals,
      sellTerminalCount: terminalCount,
    });
  }

  return entries.sort(
    (a, b) => b.bestSell - a.bestSell || a.oreCode.localeCompare(b.oreCode),
  );
}

/**
 * Read-Pfad mit Redis davor (Muster getCachedOrePriceSummary); der Key liegt
 * unter dem prices:-Präfix und wird vom UEX-Sync automatisch invalidiert.
 */
export async function getCachedTickerEntries(db: Db): Promise<TickerEntry[]> {
  if (process.env.REDIS_URL) {
    try {
      const redis = getRedis();
      if (redis.status === "wait" || redis.status === "end") {
        await redis.connect();
      }
      const cached = await redis.get(TICKER_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as TickerEntry[];
      }
      const entries = await getTickerEntries(db);
      await redis.set(
        TICKER_CACHE_KEY,
        JSON.stringify(entries),
        "EX",
        CACHE_TTL_SECONDS,
      );
      return entries;
    } catch {
      // Redis nicht erreichbar — direkt aus MongoDB bedienen
    }
  }

  return getTickerEntries(db);
}
