import { z } from "zod";

/** Kebab-case-Slugs wie "arbor-mh1", "roc-ds" (Katalog-Schlüssel). */
const codeSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

/**
 * Loadout-Methoden: bewusst OHNE "fps" (anders als MINING_METHODS der
 * Erz-Referenz) — das FPS-Multitool hat keine austauschbaren Komponenten,
 * ein Loadout dafür wäre inhaltsleer.
 */
export const LOADOUT_METHODS = ["ship", "roc"] as const;

export const MODULE_TYPES = ["active", "passive"] as const;

/**
 * Geschlossenes Set multiplikativer Modifikatoren (1.0 = neutral).
 * Gilt einheitlich für Laser, Module und Gadgets, damit die
 * Stats-Aggregation mit einer Regel auskommt.
 */
export const MODIFIER_KEYS = [
  "resistance",
  "instability",
  "optimalChargeRate",
  "optimalChargeWindow",
  "shatterDamage",
  "laserPower",
  "extractionLaserPower",
  "inertMaterials",
  "overchargeRate",
  "clusterModifier",
] as const;

const modifiersSchema = z
  .object(
    Object.fromEntries(
      MODIFIER_KEYS.map((key) => [key, z.number().positive().optional()]),
    ) as Record<ModifierKey, z.ZodOptional<z.ZodNumber>>,
  )
  .strict();

export const miningVehicleSchema = z.object({
  code: codeSchema,
  name: z.string().min(1),
  manufacturer: z.string().min(1),
  method: z.enum(LOADOUT_METHODS),
  // Size 0 = Fahrzeug-Laser (ROC/ROC-DS/ATLS GEO)
  hardpoints: z.array(z.object({ size: z.number().int().min(0).max(2) })),
  gadgetCapable: z.boolean(),
  // Werks-Laser als Builder-Vorauswahl
  stockLaserCode: codeSchema.nullable().optional(),
  uexId: z.number().int().optional(),
  patchVersion: z.string().min(1),
});

export const miningLaserSchema = z.object({
  code: codeSchema,
  name: z.string().min(1),
  manufacturer: z.string().min(1),
  size: z.number().int().min(0).max(2),
  moduleSlots: z.number().int().min(0).max(3),
  stats: z.object({
    // null bei Size-0-Lasern: in-game normalisiert, nicht mit Schiffs-Lasern vergleichbar
    laserPower: z.number().positive().nullable(),
    extractionLaserPower: z.number().positive().nullable(),
    optimalRange: z.number().positive(),
    maxRange: z.number().positive(),
  }),
  modifiers: modifiersSchema,
  patchVersion: z.string().min(1),
});

export const miningModuleSchema = z
  .object({
    code: codeSchema,
    name: z.string().min(1),
    manufacturer: z.string().min(1),
    type: z.enum(MODULE_TYPES),
    charges: z.number().int().positive().nullable(),
    durationSeconds: z.number().positive().nullable(),
    modifiers: modifiersSchema,
    patchVersion: z.string().min(1),
  })
  .refine(
    (module) =>
      module.type === "active"
        ? module.charges !== null
        : module.charges === null && module.durationSeconds === null,
    {
      message: "active modules need charges, passive modules must not have any",
    },
  );

export const miningGadgetSchema = z.object({
  code: codeSchema,
  name: z.string().min(1),
  manufacturer: z.string().min(1),
  modifiers: modifiersSchema,
  patchVersion: z.string().min(1),
});

export type LoadoutMethod = (typeof LOADOUT_METHODS)[number];
export type ModifierKey = (typeof MODIFIER_KEYS)[number];
export type ModuleType = (typeof MODULE_TYPES)[number];
export type Modifiers = z.infer<typeof modifiersSchema>;
export type MiningVehicle = z.infer<typeof miningVehicleSchema>;
export type MiningLaser = z.infer<typeof miningLaserSchema>;
export type MiningModule = z.infer<typeof miningModuleSchema>;
export type MiningGadget = z.infer<typeof miningGadgetSchema>;
