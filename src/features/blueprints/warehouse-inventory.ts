import type { WarehouseEntry } from "@/features/warehouse/warehouse.schema";
import type { Material } from "./materials.schema";

/**
 * Übersetzt Lager-Erzbestände in eine Material-Bestandskarte für die
 * Craftability-Rechnung (`computeCraftability` erwartet Material-Code → Menge).
 *
 * Roh und raffiniert desselben Erzes werden summiert (bewusste
 * Produkt-Entscheidung): beide Bestände können denselben Materialbedarf decken.
 *
 * Nur Materialien mit `oreCode` können aus dem Lager stammen. Gecraftete oder
 * Item-Materialien (ohne `oreCode`) tauchen bewusst nicht auf, damit die
 * Craftability sie korrekt als fehlend wertet — das Lager hält nur Erze.
 */
export function buildWarehouseMaterialMap(
  entries: WarehouseEntry[],
  materials: Material[],
): Map<string, number> {
  const scuByOre = new Map<string, number>();
  for (const entry of entries) {
    scuByOre.set(
      entry.oreCode,
      (scuByOre.get(entry.oreCode) ?? 0) + entry.quantityScu,
    );
  }

  const inventory = new Map<string, number>();
  for (const material of materials) {
    if (material.oreCode === undefined) continue;
    const have = scuByOre.get(material.oreCode);
    if (have !== undefined && have > 0) {
      inventory.set(material.code, have);
    }
  }
  return inventory;
}
