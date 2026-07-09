import { z } from "zod";
import { SOURCE_TYPES } from "@/features/ore-occurrences/ore-occurrences.schema";
import { MINING_METHODS } from "@/features/ores/ores.schema";

const range = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .refine((r) => r.min <= r.max, { message: "min must be <= max" });

/**
 * Scan-Signatur pro Erz und Methode (CLAUDE.md §5).
 * Ship: signatureValue identifiziert das dominante Mineral direkt.
 * ROC/FPS: signatureValue codiert nur die Vorkommens-Größe
 * (3000 = FPS-Klein-Deposit, 4000 = ROC-Groß-Deposit), nicht das Mineral.
 */
export const signatureProfileSchema = z
  .object({
    oreCode: z.string().regex(/^[A-Z]{2,5}$/),
    method: z.enum(MINING_METHODS),
    signatureValue: z.number().positive().optional(),
    signatureRange: range.optional(),
    // Nur für method="ship" fachlich relevant (Anteil des dominanten Minerals)
    dominantCompositionRange: range.optional(),
    notes: z.string().optional(),
    patchVersion: z.string().min(1),
    sourceType: z.enum(SOURCE_TYPES),
    confidenceScore: z.number().min(0).max(1),
  })
  .refine(
    (profile) =>
      (profile.signatureValue === undefined) !==
      (profile.signatureRange === undefined),
    { message: "exactly one of signatureValue or signatureRange is required" },
  );

export type SignatureProfile = z.infer<typeof signatureProfileSchema>;
