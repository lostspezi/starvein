import type { Db } from "mongodb";
import {
  findBodyBySlug,
  findStarSystemByCode,
} from "@/features/locations/locations.repository";
import type { CelestialBody } from "@/features/locations/locations.schema";
import {
  findOccurrencesByLocationWithOre,
  findOccurrencesByOreWithLocation,
  type OccurrenceWithLocation,
} from "@/features/ore-occurrences/ore-occurrences.service";
import { findOreByCode } from "@/features/ores/ores.repository";
import type { Ore } from "@/features/ores/ores.schema";

export type OreCardData = {
  ore: Ore;
  locationCount: number;
  /** Fundort mit der höchsten Wahrscheinlichkeit (Repo sortiert absteigend). */
  best: OccurrenceWithLocation | null;
};

export async function loadOreCardData(
  db: Db,
  code: string,
): Promise<OreCardData | null> {
  const ore = await findOreByCode(db, code.toUpperCase());
  if (!ore) return null;

  const occurrences = await findOccurrencesByOreWithLocation(db, ore.code);
  const locations = new Set(
    occurrences.map((o) => `${o.systemCode}|${o.bodySlug}`),
  );
  return { ore, locationCount: locations.size, best: occurrences[0] ?? null };
}

export type BodyCardData = {
  body: CelestialBody;
  systemName: string;
  oreCount: number;
};

export async function loadBodyCardData(
  db: Db,
  system: string,
  bodySlug: string,
): Promise<BodyCardData | null> {
  const systemCode = system.toUpperCase();
  const body = await findBodyBySlug(db, systemCode, bodySlug.toLowerCase());
  if (!body) return null;

  const [starSystem, occurrences] = await Promise.all([
    findStarSystemByCode(db, systemCode),
    findOccurrencesByLocationWithOre(db, systemCode, body.slug),
  ]);
  const oreCount = new Set(occurrences.map((o) => o.oreCode)).size;
  return { body, systemName: starSystem?.name ?? systemCode, oreCount };
}
