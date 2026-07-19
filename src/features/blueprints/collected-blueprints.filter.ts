import type { BlueprintCategory } from "./blueprints.schema";
import type { CraftStatus } from "./craftability";
import type { CraftableBlueprint } from "./craftable-blueprints.service";

export type CollectedBlueprintFilter = {
  q?: string | null;
  category?: BlueprintCategory | null;
  status?: CraftStatus | null;
};

/**
 * Filtert bewertete Sammlungs-Blueprints nach Freitext (Name), Kategorie und
 * Craft-Status — rein clientseitig, daher als reine Funktion testbar.
 */
export function filterCollectedBlueprints(
  entries: CraftableBlueprint[],
  { q, category, status }: CollectedBlueprintFilter,
): CraftableBlueprint[] {
  const needle = q?.trim().toLowerCase() ?? "";

  return entries.filter(({ blueprint, craftability }) => {
    if (category && blueprint.category !== category) return false;
    if (status && craftability.status !== status) return false;
    if (needle && !blueprint.outputName.toLowerCase().includes(needle)) {
      return false;
    }
    return true;
  });
}
