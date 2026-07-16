import { z } from "zod";
import { MATERIAL_KINDS, materialCodeRegex } from "./materials.schema";

/**
 * Gruppierung der 20 Wiki-`output.type`-Werte für die Filter-UI.
 * Der Rohwert bleibt als `outputType` erhalten — diese Kategorie ist eine
 * Ableitung fürs UI, keine Wiki-Angabe.
 */
export const BLUEPRINT_CATEGORIES = [
  "armor",
  "weapon",
  "ship-weapon",
  "ship-component",
  "mining",
  "salvage",
  "other",
] as const;

/**
 * Wiki-Key, z. B. BP_CRAFT_AMRS_LaserCannon_S1 (unique). Länge ist
 * upstream-kontrolliert — 4.4 lieferte erstmals 66 Zeichen, daher 96 als
 * Puffer statt 64.
 */
const blueprintKeyRegex = /^[A-Za-z0-9_]{3,96}$/;
/** URL-Slug = key.toLowerCase() (ebenfalls unique über alle Blueprints). */
const blueprintSlugRegex = /^[a-z0-9_]{3,96}$/;

export const blueprintIngredientSchema = z.object({
  materialCode: z.string().regex(materialCodeRegex),
  kind: z.enum(MATERIAL_KINDS),
  /** SCU (float) bei kind="resource", Stückzahl (int) bei kind="item". */
  quantity: z.number().positive().max(100_000),
});

export const blueprintSchema = z.object({
  key: z.string().regex(blueprintKeyRegex),
  slug: z.string().regex(blueprintSlugRegex),
  wikiUuid: z.string().uuid(),
  /** Name des gecrafteten Items; Fallback auf output_class/key, wenn null. */
  outputName: z.string().min(1),
  /** Roher Wiki-Typ (z. B. "WeaponGun") — Quelle der Wahrheit für die Kategorie. */
  outputType: z.string().min(1),
  category: z.enum(BLUEPRINT_CATEGORIES),
  craftTimeSeconds: z.number().nonnegative(),
  isAvailableByDefault: z.boolean(),
  ingredients: z.array(blueprintIngredientSchema).min(1),
  gameVersion: z.string().min(1),
  sourceType: z.enum(["wiki", "curated", "community"]),
  syncedAt: z.string().min(1),
});

export type Blueprint = z.infer<typeof blueprintSchema>;
export type BlueprintIngredient = z.infer<typeof blueprintIngredientSchema>;
export type BlueprintCategory = (typeof BLUEPRINT_CATEGORIES)[number];

export { blueprintKeyRegex, blueprintSlugRegex };
