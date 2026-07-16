import type { Db } from "mongodb";
import {
  addCollectedBlueprint,
  removeCollectedBlueprint,
} from "./blueprint-collection.repository";
import { findBlueprintByKey } from "./blueprints.repository";

export class BlueprintNotFoundError extends Error {}

async function assertBlueprintExists(
  db: Db,
  blueprintKey: string,
): Promise<void> {
  if (!(await findBlueprintByKey(db, blueprintKey))) {
    throw new BlueprintNotFoundError(`unknown blueprint: ${blueprintKey}`);
  }
}

/** Markiert einen Blueprint als gesammelt (idempotent). */
export async function collectBlueprint(
  db: Db,
  userId: string,
  blueprintKey: string,
): Promise<void> {
  await assertBlueprintExists(db, blueprintKey);
  await addCollectedBlueprint(db, userId, blueprintKey);
}

/**
 * Entfernt einen Blueprint aus der Sammlung. Bewusst ohne Existenzprüfung
 * gegen den Katalog: Einträge zu Blueprints, die ein Patch entfernt hat,
 * müssen löschbar bleiben.
 */
export async function uncollectBlueprint(
  db: Db,
  userId: string,
  blueprintKey: string,
): Promise<void> {
  await removeCollectedBlueprint(db, userId, blueprintKey);
}
