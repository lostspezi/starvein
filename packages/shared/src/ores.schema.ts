import { z } from "zod";

export const RARITY_TIERS = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
] as const;

export const MINING_METHODS = ["ship", "roc", "fps"] as const;

export const oreSchema = z.object({
  // 4-Buchstaben-Codes wie UEX (wenige Ausnahmen sind kürzer/länger, z. B. TIN)
  code: z.string().regex(/^[A-Z]{2,5}$/),
  name_de: z.string().min(1),
  name_en: z.string().min(1),
  rarityTier: z.enum(RARITY_TIERS),
  mineableBy: z.object({
    ship: z.boolean(),
    roc: z.boolean(),
    fps: z.boolean(),
  }),
  // Physikalische Eigenschaften aus den Spieldaten (Wiki-Sync) — optional,
  // damit ältere Dokumente und Desktop-Consumer weiter parsen.
  density: z.number().positive().optional(),
  instability: z.number().nonnegative().optional(),
  // Kann negativ sein (z. B. Kupfer -0.7)
  resistance: z.number().optional(),
});

export type Ore = z.infer<typeof oreSchema>;
export type RarityTier = (typeof RARITY_TIERS)[number];
export type MiningMethod = (typeof MINING_METHODS)[number];
