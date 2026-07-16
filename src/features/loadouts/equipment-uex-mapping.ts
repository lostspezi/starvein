import type { UexGeoFields } from "@/lib/uex-client";
import type { EquipmentKind } from "./equipment-prices.schema";

/** UEX-Kategorie-IDs (live verifiziert 2026-07-13). */
export const UEX_EQUIPMENT_CATEGORIES: Record<EquipmentKind, number> = {
  gadget: 28,
  laser: 29,
  module: 30,
};

/**
 * Bekannte Abweichungen UEX-Slug -> kuratierter Code (Pattern wie
 * CODE_ALIASES in refinery-and-prices/uex-mapping.ts). Aktuell leer —
 * die Suffix-/Raw-Slug-Logik deckt alle verifizierten Fälle ab.
 */
const SLUG_ALIASES: Record<string, string> = {};

const KIND_SUFFIX: Record<EquipmentKind, string | null> = {
  laser: "-mining-laser",
  module: "-module",
  gadget: null,
};

/**
 * Mappt einen UEX-Item-Slug auf unseren kuratierten Equipment-Code.
 * Erst Suffix strippen ("helix-ii-mining-laser" -> "helix-ii"), dann den
 * Roh-Slug probieren — der deckt "roc-module" (Strip ergäbe "roc") und
 * die Fahrzeug-Laser ("s0-helix", "s00-hofstede") ab. Unbekannt -> null.
 */
export function mapUexItemSlug(
  slug: string,
  kind: EquipmentKind,
  knownCodes: Set<string>,
): string | null {
  const suffix = KIND_SUFFIX[kind];
  const candidates =
    suffix !== null && slug.endsWith(suffix)
      ? [slug.slice(0, -suffix.length), slug]
      : [slug];

  for (const candidate of candidates) {
    const resolved = SLUG_ALIASES[candidate] ?? candidate;
    if (knownCodes.has(resolved)) return resolved;
  }
  return null;
}

/**
 * Baut ein Orts-Label aus den denormalisierten UEX-Geo-Feldern:
 * Standort (Stadt/Station/Outpost) · Himmelskörper (Mond/Planet/Orbit)
 * · Sternsystem — leere und direkt doppelte Teile entfallen.
 */
export function buildLocationLabel(record: UexGeoFields): string {
  const site =
    record.city_name ?? record.space_station_name ?? record.outpost_name;
  const body = record.moon_name ?? record.planet_name ?? record.orbit_name;

  const parts: string[] = [];
  for (const part of [site, body, record.star_system_name]) {
    if (!part) continue;
    if (parts[parts.length - 1] === part) continue;
    parts.push(part);
  }
  return parts.join(" · ");
}
