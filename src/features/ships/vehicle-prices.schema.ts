import { z } from "zod";

export const OFFER_TYPES = ["purchase", "rental"] as const;
export type OfferType = (typeof OFFER_TYPES)[number];

/**
 * Kauf-/Mietangebot eines Mining-Fahrzeugs (aus UEX gesynct, nicht
 * community-editierbar). Terminal-/Ortsnamen sind denormalisiert wie bei
 * equipmentPrices — der Name reist mit dem Preis, es gibt keine eigene
 * Terminal-Collection. Mietpreise gelten pro Tag (Roh-Wert von UEX, die
 * Einheit wird nur im UI gelabelt).
 */
export const vehiclePriceSchema = z.object({
  vehicleCode: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  offerType: z.enum(OFFER_TYPES),
  terminalId: z.number().int(),
  terminalName: z.string().min(1),
  // "" wenn UEX keine Geo-Namen liefert — UI rendert dann "—"
  locationLabel: z.string(),
  starSystemName: z.string().min(1).nullable(),
  price: z.number().positive(),
  syncedAt: z.string().min(1),
});

export type VehiclePrice = z.infer<typeof vehiclePriceSchema>;
