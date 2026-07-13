import type { EquipmentCatalog } from "./compatibility";
import type { EquipmentKind } from "./equipment-prices.schema";
import type { Loadout } from "./loadouts.schema";

export type ShoppingListEntry = {
  code: string;
  kind: EquipmentKind;
  name: string;
  quantity: number;
};

/**
 * Einkaufsliste eines Loadouts: distinct Laser (Menge = Vorkommen über
 * die Hardpoints), dann distinct Module, dann Gadgets — in Reihenfolge
 * des ersten Auftretens. Codes ohne Katalog-Eintrag werden übersprungen
 * (gleiche Toleranz wie die Detailseite beim Auflösen).
 */
export function buildShoppingList(
  loadout: Pick<Loadout, "hardpoints" | "gadgetCodes">,
  catalog: EquipmentCatalog,
): ShoppingListEntry[] {
  const lasersByCode = new Map(catalog.lasers.map((l) => [l.code, l]));
  const modulesByCode = new Map(catalog.modules.map((m) => [m.code, m]));
  const gadgetsByCode = new Map(catalog.gadgets.map((g) => [g.code, g]));

  const entries = new Map<string, ShoppingListEntry>();

  function add(code: string, kind: EquipmentKind, name: string | undefined) {
    if (name === undefined) return;
    const key = `${kind}:${code}`;
    const existing = entries.get(key);
    if (existing) {
      existing.quantity += 1;
    } else {
      entries.set(key, { code, kind, name, quantity: 1 });
    }
  }

  for (const hardpoint of loadout.hardpoints) {
    add(
      hardpoint.laserCode,
      "laser",
      lasersByCode.get(hardpoint.laserCode)?.name,
    );
  }
  for (const hardpoint of loadout.hardpoints) {
    for (const moduleCode of hardpoint.moduleCodes) {
      add(moduleCode, "module", modulesByCode.get(moduleCode)?.name);
    }
  }
  for (const gadgetCode of loadout.gadgetCodes) {
    add(gadgetCode, "gadget", gadgetsByCode.get(gadgetCode)?.name);
  }

  return [...entries.values()];
}
