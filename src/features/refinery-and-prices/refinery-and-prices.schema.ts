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

export const refineryMethodSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  ratingYield: z.number().int().min(1).max(3),
  ratingCost: z.number().int().min(1).max(3),
  ratingSpeed: z.number().int().min(1).max(3),
  syncedAt: z.string().min(1),
});

export type PriceSnapshot = z.infer<typeof priceSnapshotSchema>;
export type RefineryYield = z.infer<typeof refineryYieldSchema>;
export type RefineryMethod = z.infer<typeof refineryMethodSchema>;
