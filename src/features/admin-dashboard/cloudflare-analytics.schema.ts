import { z } from "zod";

const nonNegInt = z.number().int().nonnegative();

/**
 * SEO-/Traffic-DTO fürs Dashboard. `configured` = alle nötigen Cloudflare-Env
 * gesetzt; `unavailable` = Abruf schlug fehl / API-Fehler. Beide false ⇒ Daten
 * sind gültig (auch wenn Arrays leer sind = keine Besuche im Zeitraum).
 */
export const seoAnalyticsSchema = z.object({
  configured: z.boolean(),
  unavailable: z.boolean(),
  totalPageViews: nonNegInt,
  countries: z.array(z.object({ country: z.string(), views: nonNegInt })),
  referrers: z.array(z.object({ referrer: z.string(), views: nonNegInt })),
  topPages: z.array(z.object({ path: z.string(), views: nonNegInt })),
  pageViews: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      views: nonNegInt,
    }),
  ),
});

export type SeoAnalytics = z.infer<typeof seoAnalyticsSchema>;
