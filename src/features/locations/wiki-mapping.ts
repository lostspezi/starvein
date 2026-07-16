/**
 * Reines Mapping Wiki-Starmap-Location -> CelestialBody (kein I/O).
 *
 * Das Wiki kennt nur die Klassifikationen Planet/Moon/Outpost/Asteroid/
 * Manmade/Settlement/Anomaly/Star/"Solar System"/"Nav. Point" (verifiziert
 * 2026-07-16). Lagrange-Cluster wie "HUR L1" firmieren als "Asteroid" —
 * daher die Namens-Heuristik. Höhlen existieren nicht als eigene Locations.
 */
import type { ScWikiLocation } from "@/lib/scwiki-client";
import type { BodyType, CelestialBody } from "./locations.schema";

/** Direkt übernehmbare Klassifikationen (Asteroid wird gesondert behandelt). */
const CLASSIFICATION_TO_BODY_TYPE: Record<string, BodyType> = {
  Planet: "planet",
  Moon: "moon",
  Outpost: "outpost",
};

/** "HUR L1", "ARC L3" etc. — Lagrange-Cluster tragen den Punkt im Namen. */
const LAGRANGE_NAME = /\bL[1-5]\b/;

/** "Stanton System" -> "STANTON". */
export function systemCodeFromWikiSystem(system: string): string {
  return system.replace(/\s+System$/i, "").toUpperCase();
}

const NO_RESOURCE_UUIDS: ReadonlySet<string> = new Set();

/**
 * Mappt eine Wiki-Location auf ein CelestialBody oder null (= nicht syncen).
 * Asteroiden nur mit Ressourcen ODER wenn sie von Mining-Daten referenziert
 * werden (`resourceLocationUuids`) — seit 4.9 liefert das Wiki
 * has_resources flächendeckend als false, die Referenz ist dann die einzige
 * verlässliche Quelle. Wirklich leere Felsen (~600) bleiben draußen.
 * Outposts immer (Mining Areas ohne eigene Ressourcen erben per Roll-up).
 */
export function mapWikiLocation(
  location: ScWikiLocation,
  knownSystemCodes: ReadonlySet<string>,
  resourceLocationUuids: ReadonlySet<string> = NO_RESOURCE_UUIDS,
): CelestialBody | null {
  const systemCode = systemCodeFromWikiSystem(location.system ?? "");
  if (!knownSystemCodes.has(systemCode)) return null;

  const classification = location.type?.classification ?? "";
  let type = CLASSIFICATION_TO_BODY_TYPE[classification];

  if (!type && classification === "Asteroid") {
    if (!location.has_resources && !resourceLocationUuids.has(location.uuid)) {
      return null;
    }
    type = LAGRANGE_NAME.test(location.name)
      ? "lagrangePoint"
      : "asteroidField";
  }
  if (!type) return null;

  return {
    slug: location.slug,
    systemCode,
    type,
    name: location.name,
    parentSlug: location.parent?.slug ?? null,
    wikiUuid: location.uuid,
  };
}

/**
 * Zweiter Pass: Parent-Referenzen nullen, deren Ziel dem Filter zum Opfer
 * fiel (z. B. Stern-Parents von Planeten) — verhindert hängende
 * Breadcrumb-Ketten.
 */
export function dropOrphanParents(bodies: CelestialBody[]): CelestialBody[] {
  const present = new Set(bodies.map((b) => `${b.systemCode}|${b.slug}`));
  return bodies.map((body) =>
    body.parentSlug && !present.has(`${body.systemCode}|${body.parentSlug}`)
      ? { ...body, parentSlug: null }
      : body,
  );
}
