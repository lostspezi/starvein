import type { Db } from "mongodb";
import { findBodyBySlug } from "@/features/locations/locations.repository";
import type {
  BodyType,
  CelestialBody,
} from "@/features/locations/locations.schema";
import type { MiningMethod, RarityTier } from "@/features/ores/ores.schema";
import {
  getBestSellByOre,
  getBestSellByOreCached,
} from "@/features/refinery-and-prices/price-summary";
import { CACHE_TAGS, cachedQuery } from "@/lib/data-cache";
import {
  findOccurrencesByLocation,
  findOccurrencesByOre,
} from "./ore-occurrences.repository";
import type { OreOccurrence } from "./ore-occurrences.schema";

export type OccurrenceWithLocation = OreOccurrence & {
  bodyName: string;
  bodyType: BodyType;
  // Scan-Signatur des Erzes für diese Methode (CLAUDE.md §5):
  // Ship identifiziert das Mineral, ROC/FPS nur die Deposit-Größe.
  signatureValue?: number;
  signatureRange?: { min: number; max: number };
  // Bester aktueller Verkaufspreis (aUEC/SCU) aus dem UEX-Sync
  bestRawSell: number | null;
  bestRefinedSell: number | null;
};

/**
 * Für Seiten-Reads: gecachte Variante (Tag wiki-data). Enthält bewusst KEINE
 * Preise (bestRawSell/bestRefinedSell bleiben null) — der uex-Sync
 * invalidiert nur den uex-Tag, Preise im wiki-Cache würden bis zur
 * wiki-TTL veralten. Preise ergänzt {@link findOccurrencesByOreWithLocationAndPrices}.
 */
export function findOccurrencesByOreWithLocationCached(
  db: Db,
  oreCode: string,
  method?: MiningMethod | null,
): Promise<OccurrenceWithLocation[]> {
  // v3: DTO um Deposit-Felder erweitert (v2: Signatur) — Key-Version
  // verhindert, dass beim Deploy alte, formveraltete Cache-Einträge
  // gelesen werden (DTO-Shape-Regel, Prod-Vorfall 2026-07-16).
  return cachedQuery(
    CACHE_TAGS.wiki,
    ["occurrences-by-ore-v3", oreCode, method],
    () => findOccurrencesByOreWithLocation(db, oreCode, method),
  );
}

/**
 * Seiten-Read für die Erz-Detailseite: wiki-gecachte Vorkommen + Signaturen,
 * kombiniert mit uex-gecachten Preisen (frisch, kurze TTL). Alle Zeilen
 * betreffen dasselbe Erz — der beste Roh-/Refined-Preis gilt daher für jede.
 */
export async function findOccurrencesByOreWithLocationAndPrices(
  db: Db,
  oreCode: string,
  method?: MiningMethod | null,
): Promise<OccurrenceWithLocation[]> {
  const [rows, bestSellByOre] = await Promise.all([
    findOccurrencesByOreWithLocationCached(db, oreCode, method),
    getBestSellByOreCached(db),
  ]);
  const bestSell = bestSellByOre.get(oreCode);
  return rows.map((row) => ({
    ...row,
    bestRawSell: bestSell?.raw ?? null,
    bestRefinedSell: bestSell?.refined ?? null,
  }));
}

export type OccurrenceWithOre = OreOccurrence & {
  oreName: string;
  rarityTier: RarityTier;
  // Scan-Signatur des Erzes für diese Methode (CLAUDE.md §5):
  // Ship identifiziert das Mineral, ROC/FPS nur die Deposit-Größe.
  signatureValue?: number;
  signatureRange?: { min: number; max: number };
  // Bester aktueller Verkaufspreis (aUEC/SCU) aus dem UEX-Sync
  bestRawSell: number | null;
  bestRefinedSell: number | null;
};

/** "Erz auswählen → alle Fundorte": Vorkommen inkl. Location-Anzeige-Daten. */
export async function findOccurrencesByOreWithLocation(
  db: Db,
  oreCode: string,
  method?: MiningMethod | null,
): Promise<OccurrenceWithLocation[]> {
  const occurrences = await findOccurrencesByOre(db, oreCode, method);
  if (occurrences.length === 0) return [];

  // Nur wiki-Daten (Bodies + Signaturen); Preise werden bewusst NICHT hier
  // gejoint, damit dieser Read wiki-cachebar bleibt (siehe Cached-Variante).
  const [bodyDocs, profileDocs] = await Promise.all([
    db
      .collection("celestialBodies")
      .find(
        {
          $or: occurrences.map((o) => ({
            systemCode: o.systemCode,
            slug: o.bodySlug,
          })),
        },
        { projection: { _id: 0, systemCode: 1, slug: 1, name: 1, type: 1 } },
      )
      .toArray(),
    db
      .collection("signatureProfiles")
      .find(
        { oreCode },
        {
          projection: {
            _id: 0,
            method: 1,
            signatureValue: 1,
            signatureRange: 1,
          },
        },
      )
      .toArray(),
  ]);
  const bodies = new Map(bodyDocs.map((b) => [`${b.systemCode}|${b.slug}`, b]));
  const profiles = new Map(profileDocs.map((p) => [p.method as string, p]));

  return occurrences.map((occurrence) => {
    const body = bodies.get(`${occurrence.systemCode}|${occurrence.bodySlug}`);
    const profile = profiles.get(occurrence.method);
    return {
      ...occurrence,
      bodyName: (body?.name as string) ?? occurrence.bodySlug,
      bodyType: (body?.type as BodyType) ?? "planet",
      signatureValue: profile?.signatureValue as number | undefined,
      signatureRange: profile?.signatureRange as
        { min: number; max: number } | undefined,
      bestRawSell: null,
      bestRefinedSell: null,
    };
  });
}

/** "Location auswählen → alle Vorkommen dort": Vorkommen inkl. Erz-Anzeige-Daten. */
export async function findOccurrencesByLocationWithOre(
  db: Db,
  systemCode: string,
  bodySlug: string,
  method?: MiningMethod | null,
): Promise<OccurrenceWithOre[]> {
  const occurrences = await findOccurrencesByLocation(
    db,
    systemCode,
    bodySlug,
    method,
  );
  if (occurrences.length === 0) return [];

  const oreCodes = occurrences.map((o) => o.oreCode);
  const [oreDocs, profileDocs, bestSellByOre] = await Promise.all([
    db
      .collection("ores")
      .find(
        { code: { $in: oreCodes } },
        { projection: { _id: 0, code: 1, name_en: 1, rarityTier: 1 } },
      )
      .toArray(),
    db
      .collection("signatureProfiles")
      .find(
        { oreCode: { $in: oreCodes } },
        {
          projection: {
            _id: 0,
            oreCode: 1,
            method: 1,
            signatureValue: 1,
            signatureRange: 1,
          },
        },
      )
      .toArray(),
    getBestSellByOre(db),
  ]);
  const ores = new Map(oreDocs.map((o) => [o.code as string, o]));
  const profiles = new Map(
    profileDocs.map((p) => [`${p.oreCode}|${p.method}`, p]),
  );

  return occurrences.map((occurrence) => {
    const ore = ores.get(occurrence.oreCode);
    const profile = profiles.get(`${occurrence.oreCode}|${occurrence.method}`);
    const bestSell = bestSellByOre.get(occurrence.oreCode);
    return {
      ...occurrence,
      oreName: (ore?.name_en as string) ?? occurrence.oreCode,
      rarityTier: (ore?.rarityTier as RarityTier) ?? "common",
      signatureValue: profile?.signatureValue as number | undefined,
      signatureRange: profile?.signatureRange as
        { min: number; max: number } | undefined,
      bestRawSell: bestSell?.raw ?? null,
      bestRefinedSell: bestSell?.refined ?? null,
    };
  });
}

export type OccurrencesWithInheritance = {
  occurrences: OccurrenceWithOre[];
  /** Gesetzt, wenn die Vorkommen von einem übergeordneten Body stammen. */
  inheritedFrom: CelestialBody | null;
};

/**
 * Vorkommen einer Location mit Parent-Roll-up: Outposts/Höhlen tragen im
 * Spiel (und im Wiki) keine eigenen Ressourcen-Daten — die Erze hängen am
 * Mutter-Mond/-Planeten. Hat der Body selbst keine Vorkommen, wird die
 * parentSlug-Kette hochgelaufen (Tiefen-Cap wie der Breadcrumb-Walk), bis
 * ein Body mit Vorkommen gefunden ist.
 */
export async function findOccurrencesWithInheritance(
  db: Db,
  systemCode: string,
  body: CelestialBody,
  method?: MiningMethod | null,
): Promise<OccurrencesWithInheritance> {
  const own = await findOccurrencesByLocationWithOre(
    db,
    systemCode,
    body.slug,
    method,
  );
  if (own.length > 0) return { occurrences: own, inheritedFrom: null };

  let parentSlug = body.parentSlug;
  for (let depth = 0; parentSlug && depth < 5; depth++) {
    const parent = await findBodyBySlug(db, systemCode, parentSlug);
    if (!parent) break;

    const inherited = await findOccurrencesByLocationWithOre(
      db,
      systemCode,
      parent.slug,
      method,
    );
    if (inherited.length > 0) {
      return { occurrences: inherited, inheritedFrom: parent };
    }
    parentSlug = parent.parentSlug;
  }

  return { occurrences: [], inheritedFrom: null };
}
