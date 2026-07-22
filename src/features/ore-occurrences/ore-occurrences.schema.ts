import { z } from "zod";
import { MINING_METHODS } from "@/features/ores/ores.schema";

export const SOURCE_TYPES = ["curated", "wiki"] as const;

/** Haupt- vs. Nebenvorkommen an einer Location (nur ship-relevant differenziert). */
export const DEPOSIT_TYPES = ["primary", "secondary"] as const;

const compositionRangeSchema = z.object({
  min: z.number().min(0).max(100),
  max: z.number().min(0).max(100),
});

const rockBreakdownEntrySchema = z.object({
  /** Anzeigename des Rock-Typs (Wiki label ?? key). */
  rockLabel: z.string().min(1),
  /** true, wenn dieses Erz das dominante Mineral des Rocks ist. */
  isPrimary: z.boolean(),
  /** Anteil dieses Erzes in diesem Rock (über Quality-Bänder aggregiert). */
  oreCompositionPercent: compositionRangeSchema,
  dominantMaterialName: z.string().min(1),
  dominantMaterialOreCode: z
    .string()
    .regex(/^[A-Z]{2,5}$/)
    .optional(),
});

export const oreOccurrenceSchema = z.object({
  oreCode: z.string().regex(/^[A-Z]{2,5}$/),
  systemCode: z.string().regex(/^[A-Z]+$/),
  bodySlug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  method: z.enum(MINING_METHODS),
  /** Angezeigter Wert: Chance, dass ein Rock/Deposit dort dieses Erz enthält. */
  probabilityPercent: z.number().min(0).max(100),
  /** Anteil dieses Erzes unter allen Erzen der Location (Wiki-Zusatzwert). */
  relativeProbabilityPercent: z.number().min(0).max(100).optional(),
  /**
   * Haupt- oder Nebenvorkommen. Optional: Alt-Docs und Methoden ohne
   * Rock-Daten (unbekannte Wiki-Gruppen) haben kein Feld — UI rendert dann
   * kein Badge (defensiv, siehe Prod-Vorfall 2026-07-16).
   */
  depositType: z.enum(DEPOSIT_TYPES).optional(),
  /** Anteil dieses Erzes in den relevanten Rocks (min der mins / max der maxe). */
  compositionPercent: compositionRangeSchema.optional(),
  /** Erz-Codes der dominanten Minerale, wenn dieses Erz nur Nebenprodukt ist. */
  byproductOf: z.array(z.string().regex(/^[A-Z]{2,5}$/)).optional(),
  /** Volle Gesteins-Aufschlüsselung fürs Aufklapp-Panel. */
  rockBreakdown: z.array(rockBreakdownEntrySchema).optional(),
  patchVersion: z.string().min(1),
  sourceType: z.enum(SOURCE_TYPES),
  confidenceScore: z.number().min(0).max(1),
  lastVerifiedAt: z.string().min(1),
});

export type OreOccurrence = z.infer<typeof oreOccurrenceSchema>;
export type DepositType = (typeof DEPOSIT_TYPES)[number];
export type RockBreakdownEntry = z.infer<typeof rockBreakdownEntrySchema>;
