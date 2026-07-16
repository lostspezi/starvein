import type { Blueprint, BlueprintCategory } from "./blueprints.schema";

export type BlueprintFilter = {
  category?: BlueprintCategory | null;
  /** Reverse-Lookup: nur Blueprints, die dieses Material verwenden. */
  materialCode?: string | null;
  q?: string | null;
  /** Beschränkt auf diese Keys (z. B. die Sammlung des Nutzers). */
  onlyKeys?: Set<string> | null;
};

/**
 * Filtert Blueprints nach Kategorie, verwendetem Material, Freitext
 * (Ergebnisname oder Key, case-insensitive) und optional einer Key-Whitelist.
 */
export function filterBlueprints(
  blueprints: Blueprint[],
  { category, materialCode, q, onlyKeys }: BlueprintFilter,
): Blueprint[] {
  const needle = q?.trim().toLowerCase() ?? "";
  const material = materialCode?.trim().toUpperCase() ?? "";

  return blueprints.filter((blueprint) => {
    if (onlyKeys && !onlyKeys.has(blueprint.key)) return false;
    if (category && blueprint.category !== category) return false;
    if (
      material &&
      !blueprint.ingredients.some((i) => i.materialCode === material)
    ) {
      return false;
    }
    if (needle) {
      const haystack =
        `${blueprint.outputName} ${blueprint.key} ${blueprint.outputType}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}
