import type { Db } from "mongodb";
import { findAllBlueprints } from "./blueprints.repository";
import type { Blueprint } from "./blueprints.schema";
import { computeCraftability, type Craftability } from "./craftability";
import { getMaterialInventoryMap } from "./material-inventory.repository";

export type CraftableBlueprint = {
  blueprint: Blueprint;
  craftability: Craftability;
};

/**
 * Bewertet jeden Blueprint gegen den Materialbestand des Nutzers.
 * Sortierung: craftbar zuerst (nach maxCraftable absteigend), dann teilweise.
 */
export async function findCraftableForUser(
  db: Db,
  userId: string,
): Promise<{
  craftable: CraftableBlueprint[];
  partial: CraftableBlueprint[];
}> {
  const [blueprints, inventory] = await Promise.all([
    findAllBlueprints(db),
    getMaterialInventoryMap(db, userId),
  ]);

  const evaluated = blueprints.map((blueprint) => ({
    blueprint,
    craftability: computeCraftability(blueprint, inventory),
  }));

  return {
    craftable: evaluated
      .filter((entry) => entry.craftability.status === "craftable")
      .sort(
        (a, b) => b.craftability.maxCraftable - a.craftability.maxCraftable,
      ),
    partial: evaluated.filter(
      (entry) => entry.craftability.status === "partial",
    ),
  };
}
