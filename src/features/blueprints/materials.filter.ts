import type { Material, MaterialKind } from "./materials.schema";

export type MaterialFilter = {
  kind?: MaterialKind | null;
  /** Nur Materialien, die aus einem Erz stammen. */
  oresOnly?: boolean;
  q?: string | null;
};

/** Filtert Materialien nach Art, Erz-Herkunft und Freitext (Name oder Code). */
export function filterMaterials(
  materials: Material[],
  { kind, oresOnly, q }: MaterialFilter,
): Material[] {
  const needle = q?.trim().toLowerCase() ?? "";

  return materials.filter((material) => {
    if (kind && material.kind !== kind) return false;
    if (oresOnly && material.oreCode === undefined) return false;
    if (needle) {
      const haystack = `${material.name} ${material.code}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}
