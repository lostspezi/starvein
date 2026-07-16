import type { Db } from "mongodb";
import { findBodyBySlug } from "@/features/locations/locations.repository";
import type {
  BodyType,
  CelestialBody,
} from "@/features/locations/locations.schema";
import type { MiningMethod, RarityTier } from "@/features/ores/ores.schema";
import {
  findOccurrencesByLocation,
  findOccurrencesByOre,
} from "./ore-occurrences.repository";
import type { OreOccurrence } from "./ore-occurrences.schema";

export type OccurrenceWithLocation = OreOccurrence & {
  bodyName: string;
  bodyType: BodyType;
};

export type OccurrenceWithOre = OreOccurrence & {
  oreName: string;
  rarityTier: RarityTier;
};

/** "Erz auswählen → alle Fundorte": Vorkommen inkl. Location-Anzeige-Daten. */
export async function findOccurrencesByOreWithLocation(
  db: Db,
  oreCode: string,
  method?: MiningMethod | null,
): Promise<OccurrenceWithLocation[]> {
  const occurrences = await findOccurrencesByOre(db, oreCode, method);
  if (occurrences.length === 0) return [];

  const bodyDocs = await db
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
    .toArray();
  const bodies = new Map(bodyDocs.map((b) => [`${b.systemCode}|${b.slug}`, b]));

  return occurrences.map((occurrence) => {
    const body = bodies.get(`${occurrence.systemCode}|${occurrence.bodySlug}`);
    return {
      ...occurrence,
      bodyName: (body?.name as string) ?? occurrence.bodySlug,
      bodyType: (body?.type as BodyType) ?? "planet",
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

  const oreDocs = await db
    .collection("ores")
    .find(
      { code: { $in: occurrences.map((o) => o.oreCode) } },
      { projection: { _id: 0, code: 1, name_en: 1, rarityTier: 1 } },
    )
    .toArray();
  const ores = new Map(oreDocs.map((o) => [o.code as string, o]));

  return occurrences.map((occurrence) => {
    const ore = ores.get(occurrence.oreCode);
    return {
      ...occurrence,
      oreName: (ore?.name_en as string) ?? occurrence.oreCode,
      rarityTier: (ore?.rarityTier as RarityTier) ?? "common",
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
