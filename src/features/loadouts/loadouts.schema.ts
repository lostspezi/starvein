import { z } from "zod";
import type { LoadoutContent } from "./compatibility";
import { LOADOUT_METHODS } from "./equipment.schema";

export const LOADOUT_SORTS = ["top", "new"] as const;

const hardpointAssignmentSchema = z.object({
  hardpointIndex: z.number().int().min(0),
  laserCode: z.string().min(1),
  moduleCodes: z.array(z.string().min(1)).max(3),
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
      })),
    gadgetCodes: [...content.gadgetCodes].sort(),
  });
}
