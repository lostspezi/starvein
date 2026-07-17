import { unstable_cache } from "next/cache";

/**
 * Zentrale Cache-Policy für DB-Reads der öffentlichen Seiten. Zwei Tags,
 * invalidiert von den Sync-Jobs (siehe revalidate-after-sync.ts):
 * - wiki-data: Erze, Bodies, Vorkommen, Signaturen, Blueprints, Materialien
 * - uex-data:  Preise & Yields (kurze TTL, analog zur 15-min-Redis-Policy)
 *
 * Wichtig: Sync-Jobs lesen NIE über diese Wrapper — sie brauchen beim
 * Join immer den frischen Schreibstand (Stale-Read-Gefahr mitten im Sync).
 */
export const CACHE_TAGS = {
  wiki: "wiki-data",
  uex: "uex-data",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

const TTL_SECONDS: Record<CacheTag, number> = {
  "wiki-data": 3600,
  "uex-data": 900,
};

type KeyPart = string | number | null | undefined;

export function cacheKey(tag: CacheTag, keyParts: KeyPart[]): string[] {
  return [tag, ...keyParts.map((part) => String(part ?? ""))];
}

/**
 * Führt `fn` durch den Next-Data-Cache aus (Key = Tag + keyParts, TTL je
 * Tag). Außerhalb der Next-Runtime (Vitest, tsx-Skripte) wirft
 * unstable_cache "incrementalCache missing" — dann wird direkt gelesen.
 */
export async function cachedQuery<T>(
  tag: CacheTag,
  keyParts: KeyPart[],
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await unstable_cache(fn, cacheKey(tag, keyParts), {
      tags: [tag],
      revalidate: TTL_SECONDS[tag],
    })();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("incrementalCache missing")
    ) {
      return fn();
    }
    throw error;
  }
}
