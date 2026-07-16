import { z } from "zod";

/**
 * Rolling Close pro Erz und UTC-Kalendertag: jeder UEX-Sync desselben Tages
 * überschreibt das Dokument, der letzte Sync vor Mitternacht ist damit
 * automatisch der Tagesschluss. Nur Refined-Sell — der Ticker ist der
 * einzige Konsument.
 */
export const priceDailyCloseSchema = z.object({
  oreCode: z.string().regex(/^[A-Z]{2,5}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bestSell: z.number().positive(),
  syncedAt: z.string().min(1),
});

export type PriceDailyClose = z.infer<typeof priceDailyCloseSchema>;
