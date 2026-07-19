import type { Db } from "mongodb";
import { listWarehouseEntriesByOwner } from "@/features/warehouse/warehouse.repository";
import { listCollectedBlueprintKeys } from "./blueprint-collection.repository";
import { findAllBlueprints } from "./blueprints.repository";
import type { CraftStatus } from "./craftability";
import { computeCraftability } from "./craftability";
import type { CraftableBlueprint } from "./craftable-blueprints.service";
import { findAllMaterials } from "./materials.repository";
import { buildWarehouseMaterialMap } from "./warehouse-inventory";

/** Sortier-Priorität: craftbar zuerst, dann teilweise, dann fehlend. */
const STATUS_ORDER: Record<CraftStatus, number> = {
  craftable: 0,
  partial: 1,
  missing: 2,
};

/**
 * Bewertet die gesammelten Blueprints des Nutzers gegen seinen Lagerbestand
 * (`warehouseEntries`, roh + raffiniert summiert). Bewusst getrennt vom
 * abstrakten Material-Inventar (`findCraftableForUser`): Quelle ist hier
 * ausschließlich das Lager.
 *
 * Sortierung: craftbar (nach maxCraftable absteigend) → teilweise → fehlend.
 */
export async function findCollectedCraftableFromWarehouse(
  db: Db,
  userId: string,
): Promise<CraftableBlueprint[]> {
  const [collectedKeys, blueprints, materials, warehouse] = await Promise.all([
    listCollectedBlueprintKeys(db, userId),
    findAllBlueprints(db),
    findAllMaterials(db),
    listWarehouseEntriesByOwner(db, userId),
  ]);

  const inventory = buildWarehouseMaterialMap(warehouse, materials);

  return blueprints
    .filter((blueprint) => collectedKeys.has(blueprint.key))
    .map((blueprint) => ({
      blueprint,
      craftability: computeCraftability(blueprint, inventory),
    }))
    .sort((a, b) => {
      const byStatus =
        STATUS_ORDER[a.craftability.status] -
        STATUS_ORDER[b.craftability.status];
      if (byStatus !== 0) return byStatus;
      return b.craftability.maxCraftable - a.craftability.maxCraftable;
    });
}
