import { z } from "zod";
import { DEPOSIT_TYPES } from "@/features/ore-occurrences/ore-occurrences.schema";
import { MINING_METHODS } from "@/features/ores/ores.schema";

const oreCode = z.string().regex(/^[A-Z]{2,5}$/);

export const occurrenceQuerySchema = z.object({
  ore: oreCode.optional(),
  system: z
    .string()
    .regex(/^[A-Z]+$/)
    .optional(),
  method: z.enum(MINING_METHODS).optional(),
  deposit: z.enum(DEPOSIT_TYPES).optional(),
});

export const signaturesQuerySchema = z.object({
  method: z.enum(MINING_METHODS).optional(),
});

export const yieldsQuerySchema = z.object({ ore: oreCode });

/** Parst die Query-Parameter einer Request gegen ein Zod-Schema. */
export function parseQuery<S extends z.ZodType>(
  schema: S,
  request: Request,
): z.ZodSafeParseResult<z.output<S>> {
  const url = new URL(request.url);
  return schema.safeParse(Object.fromEntries(url.searchParams));
}
