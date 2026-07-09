import type { Db } from "mongodb";
import type { MiningMethod } from "@/features/ores/ores.schema";
import {
  oreOccurrenceSchema,
  type OreOccurrence,
} from "./ore-occurrences.schema";

const COLLECTION = "oreOccurrences";

const NO_ID = { projection: { _id: 0 } } as const;
// Höchste Wahrscheinlichkeit zuerst; bei Gleichstand stabil nach Slug/Erz
const SORT = {
  probabilityPercent: -1,
  bodySlug: 1,
  oreCode: 1,
  method: 1,
} as const;

export async function findOccurrencesByOre(
  db: Db,
  oreCode: string,
  method?: MiningMethod | null,
): Promise<OreOccurrence[]> {
  const filter: Record<string, unknown> = { oreCode };
  if (method) filter.method = method;

  const docs = await db
    .collection(COLLECTION)
    .find(filter, NO_ID)
    .sort(SORT)
    .toArray();
  return docs.map((doc) => oreOccurrenceSchema.parse(doc));
}

export async function findOccurrencesByLocation(
  db: Db,
  systemCode: string,
  bodySlug: string,
  method?: MiningMethod | null,
): Promise<OreOccurrence[]> {
  const filter: Record<string, unknown> = { systemCode, bodySlug };
  if (method) filter.method = method;

  const docs = await db
    .collection(COLLECTION)
    .find(filter, NO_ID)
    .sort(SORT)
    .toArray();
  return docs.map((doc) => oreOccurrenceSchema.parse(doc));
}

export async function upsertOreOccurrences(
  db: Db,
  occurrences: OreOccurrence[],
): Promise<void> {
  if (occurrences.length === 0) return;

  await db.collection(COLLECTION).bulkWrite(
    occurrences.map((occurrence) => ({
      updateOne: {
        filter: {
          oreCode: occurrence.oreCode,
          systemCode: occurrence.systemCode,
          bodySlug: occurrence.bodySlug,
          method: occurrence.method,
          patchVersion: occurrence.patchVersion,
        },
        update: { $set: occurrence },
        upsert: true,
      },
    })),
  );
}
