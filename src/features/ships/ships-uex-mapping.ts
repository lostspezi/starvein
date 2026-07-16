/**
 * Mapping UEX-Vehicle-Slug -> kuratierter Fahrzeug-Code aus
 * data/curated/mining-vehicles.json (Pattern wie SLUG_ALIASES in
 * loadouts/equipment-uex-mapping.ts): explizite Map, unbekannte Slugs
 * werden geloggt und geskippt, niemals Auto-Codes vergeben.
 *
 * Live gegen https://api.uexcorp.space/2.0/vehicles verifiziert 2026-07-16:
 * misc-prospector(148), argo-mole(122), golem(251), grin-roc(168),
 * grin-roc-ds(169), atls-geo(252). MOLE Carbon/Talus-Editionen (123/124)
 * und Concept-Schiffe (Arrastra, Orion) bleiben bewusst unmapped.
 * Mietpreise (price_rent) gelten pro Tag.
 */
export const VEHICLE_UEX_SLUGS: Record<string, string> = {
  "misc-prospector": "prospector",
  "argo-mole": "mole",
  golem: "golem",
  "grin-roc": "roc",
  "grin-roc-ds": "roc-ds",
  "atls-geo": "atls-geo",
};

/**
 * Mappt einen UEX-Vehicle-Slug auf unseren kuratierten Code — nur wenn der
 * Code auch in der DB existiert (knownCodes), sonst null.
 */
export function mapUexVehicleSlug(
  slug: string,
  knownCodes: Set<string>,
): string | null {
  const code = VEHICLE_UEX_SLUGS[slug];
  if (!code || !knownCodes.has(code)) return null;
  return code;
}
