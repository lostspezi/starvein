import { z } from "zod";

export const EQUIPMENT_KINDS = ["laser", "module", "gadget"] as const;
export type EquipmentKind = (typeof EQUIPMENT_KINDS)[number];

/**
 * Kaufort eines Equipment-Items (aus UEX gesynct, nicht community-editierbar).
 * Terminal-/Ortsnamen sind denormalisiert wie bei priceSnapshots — der Name
 * reist mit dem Preis, es gibt keine eigene Terminal-Collection.
 */
export const equipmentPriceSchema = z.object({
  equipmentCode: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  kind: z.enum(EQUIPMENT_KINDS),
  terminalId: z.number().int(),
  terminalName: z.string().min(1),
  // "" wenn UEX keine Geo-Namen liefert — UI rendert dann "—"
  locationLabel: z.string(),
  priceBuy: z.number().positive(),
  syncedAt: z.string().min(1),
});

export type EquipmentPrice = z.infer<typeof equipmentPriceSchema>;
