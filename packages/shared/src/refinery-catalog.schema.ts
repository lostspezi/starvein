import { z } from "zod";

/**
 * Refinery-Terminals gibt es nicht als eigene Collection — sie werden aus den
 * gesyncten Yields aggregiert (refinery-catalog.ts in der Web-App). Dieses
 * Schema ist der API-Contract, den auch die Desktop-App konsumiert.
 */
export const refineryTerminalSchema = z.object({
  terminalId: z.number().int(),
  terminalName: z.string().min(1),
  starSystemName: z.string().nullable(),
});

export const refineryMethodSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  ratingYield: z.number().int().min(1).max(3),
  ratingCost: z.number().int().min(1).max(3),
  ratingSpeed: z.number().int().min(1).max(3),
  syncedAt: z.string().min(1),
});

export type RefineryTerminal = z.infer<typeof refineryTerminalSchema>;
export type RefineryMethod = z.infer<typeof refineryMethodSchema>;
