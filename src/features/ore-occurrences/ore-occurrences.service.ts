import type { Db } from "mongodb";
import type { BodyType } from "@/features/locations/locations.schema";
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
