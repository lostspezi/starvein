import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { RARITY_TIERS, oreSchema } from "./ores.schema";

/**
 * Kuratiertes Mapping Wiki-Commodity-Key -> STARVEIN-Erzcode.
 * Die 4-Buchstaben-Codes keyen UEX-Preise und die Desktop-OCR — deshalb
 * niemals Auto-Codes aus Wiki-Namen ableiten; neue Minerale brauchen einen
 * Eintrag in data/curated/ore-codes.json.
 */
export const oreCodeMappingSchema = z.object({
  wikiKey: z.string().min(1),
  code: oreSchema.shape.code,
  name_de: z.string().min(1),
  name_en: z.string().min(1),
  /** Greift, wenn das Wiki tier=null liefert (alle Ground-Gems). */
  rarityTierFallback: z.enum(RARITY_TIERS),
  /** Nur für Gems, bei denen das Wiki keinerlei Mineable-Booleans setzt. */
  mineableByFallback: oreSchema.shape.mineableBy.optional(),
});

export type OreCodeMapping = z.infer<typeof oreCodeMappingSchema>;

const curatedFileSchema = z.object({
  _meta: z.object({
    generatedAt: z.string(),
    sources: z.array(z.string()),
    notes: z.string().optional(),
  }),
  oreCodes: z.array(oreCodeMappingSchema),
});

/** Liest und validiert data/curated/ore-codes.json (nur serverseitig nutzbar). */
export function loadCuratedOreCodes(): OreCodeMapping[] {
  const raw = readFileSync(
    join(process.cwd(), "data", "curated", "ore-codes.json"),
    "utf-8",
  );
  return curatedFileSchema.parse(JSON.parse(raw)).oreCodes;
}
