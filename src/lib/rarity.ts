import type { RarityTier } from "@/features/ores/ores.schema";

/** Zentrale Zuordnung Rarity-Tier → Text-Farb-Utility (Tokens aus globals.css). */
export const RARITY_TEXT_CLASS: Record<RarityTier, string> = {
  common: "text-rarity-common",
  uncommon: "text-rarity-uncommon",
  rare: "text-rarity-rare",
  epic: "text-rarity-epic",
  legendary: "text-rarity-legendary",
};
