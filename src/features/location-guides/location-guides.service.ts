import type { Db } from "mongodb";
import type { CelestialBody } from "@/features/locations/locations.schema";
import {
  findLocationAreaGuides,
  findLocationGuide,
} from "./location-guides.repository";
import type { LocationGuide } from "./location-guides.schema";

/**
 * Löst die "Anreise"-Info für einen Body auf: zuerst ein exakter Eintrag pro
 * Slug (z. B. NYX Glaciem Ring), sonst eine Flächen-Regel des Systems, deren
 * Body-Typ passt und deren Namensmuster auf den Body-Namen matcht (z. B. der
 * Aaron Halo für alle Stanton "Mining Base"-Felder). Ohne Treffer: null.
 */
export async function resolveLocationGuide(
  db: Db,
  body: CelestialBody,
): Promise<LocationGuide | null> {
  const exact = await findLocationGuide(db, body.systemCode, body.slug);
  if (exact) return exact;

  const areas = await findLocationAreaGuides(db, body.systemCode, body.type);
  const match = areas.find((area) =>
    new RegExp(area.namePattern).test(body.name),
  );
  if (!match) return null;

  return {
    systemCode: match.systemCode,
    bodySlug: body.slug,
    note_de: match.note_de,
    note_en: match.note_en,
    routes: match.routes,
  };
}
