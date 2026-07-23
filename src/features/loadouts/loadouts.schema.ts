import { z } from "zod";
import type { LoadoutContent } from "./compatibility";
import { LOADOUT_METHODS } from "./equipment.schema";

export const LOADOUT_SORTS = ["top", "new"] as const;

/** Eingabegrenzen für den Craft-Bonus (Crafting kann Stats auch senken). */
export const CRAFTED_BONUS_MIN_PCT = -50;
export const CRAFTED_BONUS_MAX_PCT = 100;

const hardpointAssignmentSchema = z.object({
  hardpointIndex: z.number().int().min(0),
  laserCode: z.string().min(1),
  moduleCodes: z.array(z.string().min(1)).max(3),
  // Selbst hergestellter Laser: %-Bonus auf die Basis-Power (fehlt = nicht gecraftet)
  craftedBonusPct: z
    .number()
    .min(CRAFTED_BONUS_MIN_PCT)
    .max(CRAFTED_BONUS_MAX_PCT)
    .optional(),
});

export const loadoutSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  description: z.string().max(500).optional(),
  method: z.enum(LOADOUT_METHODS),
  vehicleCode: z.string().min(1),
  // Nur bestückte Hardpoints
  hardpoints: z.array(hardpointAssignmentSchema),
  gadgetCodes: z.array(z.string().min(1)).max(3),
  ownerUserId: z.string().min(1),
  isPublic: z.boolean(),
  // Upvote-only: voters sind reine userIds, votes.up = voters.length
  votes: z.object({ up: z.number().int().min(0) }),
  voters: z.array(z.string().min(1)),
  patchVersion: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

/** User-editierbare Felder — API-Input und Builder-Formular. */
export const loadoutInputSchema = loadoutSchema
  .pick({
    name: true,
    description: true,
    method: true,
    vehicleCode: true,
    hardpoints: true,
    gadgetCodes: true,
    isPublic: true,
  })
  .strict();

export type Loadout = z.infer<typeof loadoutSchema>;
export type LoadoutInput = z.infer<typeof loadoutInputSchema>;
export type LoadoutSort = (typeof LOADOUT_SORTS)[number];

/**
 * Kanonischer Schlüssel über die inhaltlichen Felder (Fahrzeug + Komponenten).
 * Reihenfolge-unempfindlich: nur wenn sich dieser Schlüssel ändert, werden
 * beim Edit die Votes zurückgesetzt (Name/Beschreibung/isPublic nicht).
 */
export function loadoutContentKey(content: LoadoutContent): string {
  return JSON.stringify({
    method: content.method,
    vehicleCode: content.vehicleCode,
    hardpoints: [...content.hardpoints]
      .sort((a, b) => a.hardpointIndex - b.hardpointIndex)
      .map((h) => ({
        hardpointIndex: h.hardpointIndex,
        laserCode: h.laserCode,
        moduleCodes: [...h.moduleCodes].sort(),
        // fehlender Bonus == explizit 0 (stat-identisch, kein Vote-Reset)
        craftedBonusPct: h.craftedBonusPct ?? 0,
      })),
    gadgetCodes: [...content.gadgetCodes].sort(),
  });
}
