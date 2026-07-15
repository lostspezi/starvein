/**
 * Sprachen, in denen Guides verfasst werden können. Client-safe (keine
 * Server-Imports) — Editor, Filter und Schema teilen sich diese Liste.
 * Die Namen werden bewusst im nativen Sprachnamen angezeigt, damit sie
 * ohne UI-Übersetzung selbsterklärend sind.
 */
export const GUIDE_LANGUAGES = ["de", "en", "fr", "es", "it", "pt"] as const;

export type GuideLanguage = (typeof GUIDE_LANGUAGES)[number];

export const GUIDE_LANGUAGE_NAMES: Record<GuideLanguage, string> = {
  de: "Deutsch",
  en: "English",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
};

/** Fallback-Sprache, wenn die gewünschte Sprache eines Guides fehlt. */
export const GUIDE_FALLBACK_LANGUAGE: GuideLanguage = "en";

export function isGuideLanguage(value: unknown): value is GuideLanguage {
  return (
    typeof value === "string" &&
    (GUIDE_LANGUAGES as readonly string[]).includes(value)
  );
}
