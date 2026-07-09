/**
 * Zentrale Message-Zusammenführung: geteilte Messages aus src/lib/messages
 * plus ein Namespace pro Feature-Slice (statische Imports, Turbopack-sicher).
 * Jede neue Slice ergänzt hier genau zwei Imports und zwei Spreads.
 */
import deCommon from "@/lib/messages/de.json";
import enCommon from "@/lib/messages/en.json";
import deHome from "@/features/home/messages/de.json";
import enHome from "@/features/home/messages/en.json";
import deSwitcher from "@/features/i18n-switcher/messages/de.json";
import enSwitcher from "@/features/i18n-switcher/messages/en.json";
import deLocations from "@/features/locations/messages/de.json";
import enLocations from "@/features/locations/messages/en.json";
import deOccurrences from "@/features/ore-occurrences/messages/de.json";
import enOccurrences from "@/features/ore-occurrences/messages/en.json";
import deOres from "@/features/ores/messages/de.json";
import enOres from "@/features/ores/messages/en.json";
import deSearch from "@/features/search/messages/de.json";
import enSearch from "@/features/search/messages/en.json";
import deSignatures from "@/features/signature-profiles/messages/de.json";
import enSignatures from "@/features/signature-profiles/messages/en.json";

const messages = {
  de: {
    ...deCommon,
    ...deHome,
    ...deSwitcher,
    ...deOres,
    ...deLocations,
    ...deSearch,
    ...deOccurrences,
    ...deSignatures,
  },
  en: {
    ...enCommon,
    ...enHome,
    ...enSwitcher,
    ...enOres,
    ...enLocations,
    ...enSearch,
    ...enOccurrences,
    ...enSignatures,
  },
};

export type AppLocale = keyof typeof messages;

export function loadMessages(locale: AppLocale) {
  return messages[locale];
}
