import type { Db } from "mongodb";
import { findBlueprintsByMaterialCodes } from "./blueprints.repository";
import type { Blueprint } from "./blueprints.schema";
import { findMaterialsByOreCode } from "./materials.repository";
import type { Material } from "./materials.schema";

export type BlueprintUsingOre = {
  blueprint: Blueprint;
  /** Die Materialien, über die das Erz in diesen Blueprint eingeht. */
  viaMaterials: Material[];
};

/**
 * Erz → Blueprint in genau einem transitiven Schritt:
 * ore.code → materials.oreCode → blueprints.components[].materialCode.
 * Zwei indexierte Queries statt Aggregation — die Kataloge sind klein.
 */
export async function findBlueprintsUsingOre(
  db: Db,
  oreCode: string,
): Promise<BlueprintUsingOre[]> {
  const materials = await findMaterialsByOreCode(db, oreCode);
  if (materials.length === 0) return [];

  const byCode = new Map(materials.map((m) => [m.code, m]));
  const blueprints = await findBlueprintsByMaterialCodes(db, [
    ...byCode.keys(),
  ]);

  return blueprints.map((blueprint) => ({
    blueprint,
    viaMaterials: blueprint.ingredients
      .map((ingredient) => byCode.get(ingredient.materialCode))
      .filter((material): material is Material => material !== undefined),
  }));
}
