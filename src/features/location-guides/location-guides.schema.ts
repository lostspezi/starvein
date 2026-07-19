import { z } from "zod";
import {
  BODY_TYPES,
  SYSTEM_CODES,
} from "@/features/locations/locations.schema";

/** Slug-Regex identisch zu celestialBodySchema (locations.schema.ts). */
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

/**
 * Eine konkrete Anreise-Route: In Star Citizen kann man Asteroiden-Gürtel/-Felder
 * nicht direkt anspringen. Man reist per Quantum zwischen zwei Punkten und steigt
 * bei einer bestimmten Rest-Distanz manuell aus.
 */
export const locationRouteSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  /** Rest-Distanz zum Ziel beim manuellen Aussteigen, in km. */
  dropDistanceKm: z.number().int().positive(),
});

export type LocationRoute = z.infer<typeof locationRouteSchema>;

/** Gemeinsamer Anreise-Inhalt (zweisprachige Prosa + optionale Routen). */
const guideContentFields = {
  // Kuratierte Prosa (wie Erznamen) — zweisprachig, beide optional.
  note_de: z.string().min(1).optional(),
  note_en: z.string().min(1).optional(),
  routes: z.array(locationRouteSchema).nonempty().optional(),
};

const hasContent = (guide: {
  note_de?: string;
  note_en?: string;
  routes?: unknown[];
}) => Boolean(guide.note_de || guide.note_en || guide.routes);

const CONTENT_REFINEMENT = {
  message: "guide needs at least a note or one route",
} as const;

/**
 * Kuratierte "Anreise"-Info pro Himmelskörper. Eigene Collection (nicht am
 * Body-Dokument), damit der Wiki-Sync (Prune) sie nie überschreibt.
 */
export const locationGuideSchema = z
  .object({
    systemCode: z.enum(SYSTEM_CODES),
    bodySlug: slug,
    ...guideContentFields,
  })
  .refine(hasContent, CONTENT_REFINEMENT);

export type LocationGuide = z.infer<typeof locationGuideSchema>;

/**
 * Flächen-Regel: derselbe Anreise-Hinweis für alle Bodies eines Systems mit
 * passendem Typ und Namensmuster. Für Fälle wie den Aaron Halo, der nicht als
 * einzelner Body existiert, sondern in ~50 "Mining Base"-Felder zerfällt. Wird
 * zur Laufzeit gegen den Body gematcht — unabhängig von konkreten Slugs.
 */
export const locationAreaGuideSchema = z
  .object({
    systemCode: z.enum(SYSTEM_CODES),
    bodyType: z.enum(BODY_TYPES),
    /** RegExp gegen den Body-Namen (z. B. "^Mining Base"). */
    namePattern: z.string().min(1).refine(isValidRegExp, {
      message: "namePattern must be a valid regular expression",
    }),
    ...guideContentFields,
  })
  .refine(hasContent, CONTENT_REFINEMENT);

export type LocationAreaGuide = z.infer<typeof locationAreaGuideSchema>;

function isValidRegExp(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}
