import de from "./messages/de.json";
import en from "./messages/en.json";

/**
 * Message-Registry der Desktop-App. Aktuell eine Datei pro Locale;
 * sobald Feature-Slices eigene messages/-Ordner mitbringen (Konvention
 * wie in der Web-App), werden sie hier zusammengeführt.
 */
export const messages = { de, en } as const;

export type AppLocale = keyof typeof messages;

export function detectLocale(): AppLocale {
  return navigator.language.toLowerCase().startsWith("de") ? "de" : "en";
}
