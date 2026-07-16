import { z } from "zod";
import { materialCodeRegex } from "./materials.schema";

/**
 * Bestandsmenge eines Materials pro Nutzer.
 *
 * Bewusst kein int: Materialien der Art "resource" werden in SCU geführt und
 * sind im Spiel gebrochen (das Wiki liefert Zutatenmengen wie 0.36 SCU).
 * Nur "item"-Materialien sind Stückzahlen.
 */
export const materialInventorySchema = z.object({
  userId: z.string().min(1),
  materialCode: z.string().regex(materialCodeRegex),
  quantity: z.number().min(0).max(1_000_000),
  updatedAt: z.string().min(1),
});

/**
 * Request-Body zum Setzen einer Menge (idempotentes PUT, kein Increment).
 * quantity 0 löscht den Eintrag (siehe material-inventory.service).
 */
export const materialInventorySetInputSchema = z
  .object({
    materialCode: z.string().regex(materialCodeRegex),
    quantity: z.number().min(0).max(1_000_000),
  })
  .strict();

export type MaterialInventoryEntry = z.infer<typeof materialInventorySchema>;
export type MaterialInventorySetInput = z.infer<
  typeof materialInventorySetInputSchema
>;
