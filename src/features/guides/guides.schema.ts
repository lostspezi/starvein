import { z } from "zod";

/**
 * Erlaubte Bild-Quelle: ausschließlich unsere eigene GridFS-Ausgabe-Route
 * (same-origin, 24-stellige Mongo-ObjectId). Fremde/externe URLs werden
 * bewusst abgelehnt — kein Hotlinking, kein SSRF-Vektor über gerenderte Bilder.
 */
export const GUIDE_IMAGE_SRC_PATTERN = /^\/api\/guides\/images\/[a-f0-9]{24}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export const GUIDE_TITLE_MAX = 120;
export const GUIDE_DESCRIPTION_MAX = 300;
export const GUIDE_TAG_MAX_LENGTH = 24;
export const GUIDE_MAX_TAGS = 8;
export const GUIDE_HEADING_LEVELS = [1, 2, 3] as const;
/** Obergrenze für das serialisierte Dokument — begrenzt den Request-Payload. */
export const GUIDE_CONTENT_MAX_BYTES = 200_000;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isYoutubeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const httpish = url.protocol === "http:" || url.protocol === "https:";
    return httpish && YOUTUBE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

// --- TipTap-JSON-Allowlist (erste Verteidigungslinie beim Schreiben) -------
// Nur diese Node-/Mark-Typen und Attribute dürfen gespeichert werden. Der
// Client könnte die API direkt aufrufen, deshalb wird die JSON-Struktur hier
// streng validiert (unbekannte Attribute strippt Zod, unbekannte Typen fallen
// durch die discriminatedUnion).

const markSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }),
  z.object({ type: z.literal("italic") }),
  z.object({ type: z.literal("strike") }),
  z.object({ type: z.literal("code") }),
  z.object({
    type: z.literal("link"),
    attrs: z.object({
      href: z.string().refine(isHttpUrl, "link href must be http(s)"),
      target: z.string().nullish(),
      rel: z.string().nullish(),
      class: z.string().nullish(),
    }),
  }),
]);

const textNodeSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  marks: z.array(markSchema).optional(),
});

type GuideNode =
  | z.infer<typeof textNodeSchema>
  | { type: string; attrs?: unknown; content?: GuideNode[] };

const guideNodeSchema: z.ZodType<GuideNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    textNodeSchema,
    z.object({
      type: z.literal("paragraph"),
      content: z.array(guideNodeSchema).optional(),
    }),
    z.object({
      type: z.literal("heading"),
      attrs: z.object({
        level: z
          .number()
          .int()
          .refine(
            (level) =>
              (GUIDE_HEADING_LEVELS as readonly number[]).includes(level),
            "heading level must be 1-3",
          ),
      }),
      content: z.array(guideNodeSchema).optional(),
    }),
    z.object({
      type: z.literal("bulletList"),
      content: z.array(guideNodeSchema).optional(),
    }),
    z.object({
      type: z.literal("orderedList"),
      attrs: z.object({ start: z.number().int().optional() }).optional(),
      content: z.array(guideNodeSchema).optional(),
    }),
    z.object({
      type: z.literal("listItem"),
      content: z.array(guideNodeSchema).optional(),
    }),
    z.object({
      type: z.literal("blockquote"),
      content: z.array(guideNodeSchema).optional(),
    }),
    z.object({
      type: z.literal("codeBlock"),
      attrs: z.object({ language: z.string().nullish() }).optional(),
      content: z.array(guideNodeSchema).optional(),
    }),
    z.object({ type: z.literal("hardBreak") }),
    z.object({
      type: z.literal("image"),
      attrs: z.object({
        src: z.string().regex(GUIDE_IMAGE_SRC_PATTERN, "invalid image src"),
        alt: z.string().nullish(),
        title: z.string().nullish(),
      }),
    }),
    z.object({
      type: z.literal("youtube"),
      attrs: z.object({
        src: z.string().refine(isYoutubeUrl, "invalid youtube src"),
        start: z.number().int().min(0).optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      }),
    }),
  ]),
);

/** Validiertes TipTap-Dokument (`doc` mit erlaubtem Node-Baum). */
export const guideContentSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(guideNodeSchema).optional(),
  })
  .refine(
    (doc) => JSON.stringify(doc).length <= GUIDE_CONTENT_MAX_BYTES,
    "content too large",
  );

export const guideSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(GUIDE_TITLE_MAX),
  // nullish + normalize: MongoDB speichert weggelassene Felder als null
  description: z
    .string()
    .max(GUIDE_DESCRIPTION_MAX)
    .nullish()
    .transform((value) => value ?? undefined),
  tags: z
    .array(z.string().min(1).max(GUIDE_TAG_MAX_LENGTH))
    .max(GUIDE_MAX_TAGS),
  content: guideContentSchema,
  // Server-verwaltet: kleingeschriebener Suchtext (Titel + Beschreibung +
  // Fließtext) für die Volltextsuche. Default für Alt-Dokumente ohne Feld.
  searchText: z.string().default(""),
  ownerUserId: z.string().min(1),
  isPublic: z.boolean(),
  patchVersion: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

/** User-editierbare Felder — API-Input und Editor-Formular. */
export const guideInputSchema = guideSchema
  .pick({
    title: true,
    description: true,
    tags: true,
    content: true,
    isPublic: true,
  })
  .strict();

export type Guide = z.infer<typeof guideSchema>;
export type GuideInput = z.infer<typeof guideInputSchema>;
export type GuideContent = z.infer<typeof guideContentSchema>;
