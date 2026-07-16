import type { MaterialKind } from "./materials.schema";

/**
 * Mengen haben je nach Material-Art eine andere Einheit:
 * resource → SCU (Bruchmengen, z. B. 0.36), item → Stückzahl.
 *
 * SCU werden auf 2 Nachkommastellen gezeigt (kleinste echte Menge im Wiki
 * ist 0.01), aber ohne unnötige Nullen — 2 SCU statt "2.00 SCU".
 */
export function formatQuantityValue(
  quantity: number,
  kind: MaterialKind,
  locale: string,
): string {
  const maximumFractionDigits = kind === "resource" ? 2 : 0;
  return quantity.toLocaleString(locale, { maximumFractionDigits });
}

/** i18n-Key der passenden Einheit für formatQuantityValue. */
export function quantityUnitKey(kind: MaterialKind): "scu" | "count" {
  return kind === "resource" ? "scu" : "count";
}
