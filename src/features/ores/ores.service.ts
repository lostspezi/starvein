import type { Db } from "mongodb";
import { findAllSignatureProfiles } from "@/features/signature-profiles/signature-profiles.repository";
import type { SignatureProfile } from "@/features/signature-profiles/signature-profiles.schema";
import { CACHE_TAGS, cachedQuery } from "@/lib/data-cache";
import { findAllOres } from "./ores.repository";
import type { Ore } from "./ores.schema";

export type OreWithSignatures = Ore & {
  /** Scan-Signaturen je Methode (ship/roc/fps), 0–3 Einträge. */
  signatures: SignatureProfile[];
};

/** Anzeige-Zeile der Erz-Liste: Signaturen (wiki) + beste Preise (uex). */
export type OreListRow = OreWithSignatures & {
  bestRawSell: number | null;
  bestRefinedSell: number | null;
};

/**
 * Erz-Katalog inkl. aller Methoden-Signaturen — wiki-gecacht (Signaturen
 * sind kuratierte/wiki-Daten, ändern sich nur pro Patch). Preise gehören
 * NICHT hierher (uex-Tag, kurze TTL) und werden erst auf der Seite gemerged.
 */
export function findAllOresWithSignaturesCached(
  db: Db,
): Promise<OreWithSignatures[]> {
  return cachedQuery(CACHE_TAGS.wiki, ["ores-with-signatures-v1"], () =>
    findAllOresWithSignatures(db),
  );
}

export async function findAllOresWithSignatures(
  db: Db,
): Promise<OreWithSignatures[]> {
  const [ores, profiles] = await Promise.all([
    findAllOres(db),
    findAllSignatureProfiles(db),
  ]);

  const byOre = new Map<string, SignatureProfile[]>();
  for (const profile of profiles) {
    const list = byOre.get(profile.oreCode) ?? [];
    list.push(profile);
    byOre.set(profile.oreCode, list);
  }

  return ores.map((ore) => ({ ...ore, signatures: byOre.get(ore.code) ?? [] }));
}
