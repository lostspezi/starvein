import { z } from "zod";
import { blueprintKeyRegex } from "./blueprints.schema";

/** Ein gesammelter ("besessener") Blueprint pro Nutzer. */
export const blueprintCollectionSchema = z.object({
  userId: z.string().min(1),
  blueprintKey: z.string().regex(blueprintKeyRegex),
  collectedAt: z.string().min(1),
});

/** Request-Body zum Sammeln/Entfernen eines Blueprints. */
export const blueprintCollectionInputSchema = z
  .object({
    blueprintKey: z.string().regex(blueprintKeyRegex),
  })
  .strict();

export type CollectedBlueprint = z.infer<typeof blueprintCollectionSchema>;
export type BlueprintCollectionInput = z.infer<
  typeof blueprintCollectionInputSchema
>;
