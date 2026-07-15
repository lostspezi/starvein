import { z } from "zod";

export const JOB_MAX_ITEMS = 20;
/** Sanity-Cap: 2 Wochen — länger läuft kein Refinery-Job im Spiel. */
export const JOB_MAX_DURATION_MINUTES = 14 * 24 * 60;

const oreCode = z.string().regex(/^[A-Z]{2,5}$/);
const quantityScu = z.number().positive().max(100_000);
/**
 * Qualität eines Erzes/Materials (0–1000, am Refinery-Terminal ablesbar).
 * Optional, damit bestehende Job-Dokumente ohne das Feld weiter lesbar sind.
 */
const qualityRating = z.number().int().min(0).max(1000).optional();

const refineryJobItemSchema = z.object({ oreCode, quantityScu, qualityRating });

/**
 * Ein getrackter Raffinerie-Auftrag. terminalName/starSystemName sind bei
 * Create denormalisiert. "ready" wird aus startedAt + durationMinutes
 * abgeleitet (job-time.ts) und nie gespeichert — nur "collected" ist ein
 * echter, gespeicherter Statuswechsel.
 */
export const refineryJobSchema = z.object({
  id: z.string().min(1),
  ownerUserId: z.string().min(1),
  terminalId: z.number().int(),
  terminalName: z.string().min(1),
  starSystemName: z.string().nullable(),
  methodCode: z.string().min(1),
  items: z.array(refineryJobItemSchema).min(1).max(JOB_MAX_ITEMS),
  durationMinutes: z.number().int().min(1).max(JOB_MAX_DURATION_MINUTES),
  startedAt: z.string().min(1),
  status: z.enum(["processing", "collected"]),
  collectedAt: z.string().min(1).nullable(),
  patchVersion: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

/** User-editierbare Felder — API-Input und Formular. */
export const refineryJobInputSchema = refineryJobSchema
  .pick({
    terminalId: true,
    methodCode: true,
    items: true,
    durationMinutes: true,
  })
  .extend({ startedAt: refineryJobSchema.shape.startedAt.optional() })
  .strict();

/**
 * Abholen: die raffinierten Output-Mengen sind editierbar (Yield ≠ Input).
 * Ohne transfer wird nur der Status gewechselt, nichts eingelagert.
 */
export const collectJobInputSchema = z
  .object({
    transfer: z.array(refineryJobItemSchema).max(JOB_MAX_ITEMS).optional(),
  })
  .strict();

export type RefineryJob = z.infer<typeof refineryJobSchema>;
export type RefineryJobInput = z.infer<typeof refineryJobInputSchema>;
export type CollectJobInput = z.infer<typeof collectJobInputSchema>;
