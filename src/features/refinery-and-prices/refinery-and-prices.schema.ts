import { z } from "zod";

export const priceSnapshotSchema = z.object({
  oreCode: z.string().regex(/^[A-Z]{2,5}$/),
  kind: z.enum(["raw", "refined"]),
  terminalId: z.number().int(),
  terminalName: z.string().min(1),
  priceBuy: z.number().min(0),
  priceSell: z.number().min(0),
  syncedAt: z.string().min(1),
});

/**
 * UEX modelliert Refinery-Yields als prozentualen Bonus/Malus pro Erz und
 * Refinery-Terminal (nicht als absoluten yieldPercent — live verifiziert
 * am 2026-07-09, abweichend von der Skizze in CLAUDE.md §5).
 */
export const refineryYieldSchema = z.object({
  oreCode: z.string().regex(/^[A-Z]{2,5}$/),
  terminalId: z.number().int(),
  terminalName: z.string().min(1),
  starSystemName: z.string().nullable(),
  bonusPercent: z.number(),
  syncedAt: z.string().min(1),
});

// Methoden-Contract lebt in packages/shared (Desktop-App nutzt ihn ebenfalls);
// hier re-exportiert, damit bestehende Web-Imports gültig bleiben.
export {
  refineryMethodSchema,
  type RefineryMethod,
} from "@starvein/shared/refinery-catalog";

export type PriceSnapshot = z.infer<typeof priceSnapshotSchema>;
export type RefineryYield = z.infer<typeof refineryYieldSchema>;
