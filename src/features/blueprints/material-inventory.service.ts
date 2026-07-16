import type { Db } from "mongodb";
import {
  deleteMaterialQuantity,
  setMaterialQuantity,
} from "./material-inventory.repository";
import type {
  MaterialInventoryEntry,
  MaterialInventorySetInput,
} from "./material-inventory.schema";
import { findMaterialByCode } from "./materials.repository";

export class InventoryValidationError extends Error {}

/**
 * Setzt die Bestandsmenge eines Materials. Menge 0 löscht den Eintrag,
 * damit der Craftability-Scan nur echte Bestände liest.
 * Gibt null zurück, wenn der Eintrag gelöscht wurde.
 */
export async function setInventory(
  db: Db,
  userId: string,
  input: MaterialInventorySetInput,
): Promise<MaterialInventoryEntry | null> {
  if (!(await findMaterialByCode(db, input.materialCode))) {
    throw new InventoryValidationError(
      `unknown material: ${input.materialCode}`,
    );
  }

  if (input.quantity === 0) {
    await deleteMaterialQuantity(db, userId, input.materialCode);
    return null;
  }

  return setMaterialQuantity(db, userId, input.materialCode, input.quantity);
}
