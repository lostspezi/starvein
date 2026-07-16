import { z } from "zod";

/**
 * Zutaten-Art laut SC-Wiki. Bestimmt die Mengeneinheit:
 * - resource: Menge in SCU (float, Schiffsbergbau-Raffinat)
 * - item: Stückzahl (int, ROC/FPS-Gems)
 */
export const MATERIAL_KINDS = ["resource", "item"] as const;

/**
 * Material-Codes: Erz-Code bei erzbasierten Materialien (AGRI, HADA, …),
 * sonst aus dem Namen abgeleitet (PRESSURIZED_ICE).
 */
const materialCodeRegex = /^[A-Z0-9_]{2,32}$/;
/** oreCode behält die strikte Erz-Regex, damit der Join zu ores.code exakt bleibt. */
const oreCodeRegex = /^[A-Z]{2,5}$/;

export const materialSchema = z.object({
  code: z.string().regex(materialCodeRegex),
  /** Spielbegriff — bleibt unübersetzt (CLAUDE.md §9). */
  name: z.string().min(1),
  kind: z.enum(MATERIAL_KINDS),
  // Gesetzt, wenn die Zutat einem minebaren Erz entspricht (34/37 der Zutaten).
  oreCode: z.string().regex(oreCodeRegex).optional(),
  /** resource_type_uuid bzw. item_uuid aus dem Wiki. */
  wikiUuid: z.string().uuid(),
  gameVersion: z.string().min(1),
  sourceType: z.enum(["wiki", "curated", "community"]),
  syncedAt: z.string().min(1),
});

export type Material = z.infer<typeof materialSchema>;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];

export { materialCodeRegex, oreCodeRegex };
