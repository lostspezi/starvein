import { z } from "zod";

/** Registrierungen pro Auth-Provider (discord, google, …). */
export const providerCountSchema = z.object({
  provider: z.string(),
  count: z.number().int().nonnegative(),
});

/** Ein Tagespunkt der Registrierungs-Zeitreihe (Datum = YYYY-MM-DD, UTC). */
export const dailyCountSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  count: z.number().int().nonnegative(),
});

/** Letzte Anmeldungen — bewusst ohne E-Mail (Datenschutz). */
export const recentSignupSchema = z.object({
  name: z.string(),
  provider: z.string().nullable(),
  createdAt: z.string(),
});

export const registrationStatsSchema = z.object({
  totalUsers: z.number().int().nonnegative(),
  newLast24h: z.number().int().nonnegative(),
  newLast7d: z.number().int().nonnegative(),
  newLast30d: z.number().int().nonnegative(),
  activeSessions: z.number().int().nonnegative(),
  byProvider: z.array(providerCountSchema),
  dailySignups: z.array(dailyCountSchema),
  recentSignups: z.array(recentSignupSchema),
});

export type ProviderCount = z.infer<typeof providerCountSchema>;
export type DailyCount = z.infer<typeof dailyCountSchema>;
export type RecentSignup = z.infer<typeof recentSignupSchema>;
export type RegistrationStats = z.infer<typeof registrationStatsSchema>;
