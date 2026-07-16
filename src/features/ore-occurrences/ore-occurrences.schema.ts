import { z } from "zod";
import { MINING_METHODS } from "@/features/ores/ores.schema";

export const SOURCE_TYPES = ["curated", "wiki"] as const;

export const oreOccurrenceSchema = z.object({
  oreCode: z.string().regex(/^[A-Z]{2,5}$/),
  systemCode: z.string().regex(/^[A-Z]+$/),
  bodySlug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  method: z.enum(MINING_METHODS),
  /** Angezeigter Wert: Chance, dass ein Rock/Deposit dort dieses Erz enthält. */
  probabilityPercent: z.number().min(0).max(100),
  /** Anteil dieses Erzes unter allen Erzen der Location (Wiki-Zusatzwert). */
  relativeProbabilityPercent: z.number().min(0).max(100).optional(),
  patchVersion: z.string().min(1),
  sourceType: z.enum(SOURCE_TYPES),
  confidenceScore: z.number().min(0).max(1),
  lastVerifiedAt: z.string().min(1),
});

export type OreOccurrence = z.infer<typeof oreOccurrenceSchema>;
