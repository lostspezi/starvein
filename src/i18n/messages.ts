/**
 * Zentrale Message-Zusammenführung: geteilte Messages aus src/lib/messages
 * plus ein Namespace pro Feature-Slice (statische Imports, Turbopack-sicher).
 * Jede neue Slice ergänzt hier genau zwei Imports und zwei Spreads.
 */
import deCommon from "@/lib/messages/de.json";
import enCommon from "@/lib/messages/en.json";
import deAuth from "@/features/auth/messages/de.json";
import enAuth from "@/features/auth/messages/en.json";
import deChat from "@/features/chat/messages/de.json";
import enChat from "@/features/chat/messages/en.json";
import deModeration from "@/features/moderation/messages/de.json";
import enModeration from "@/features/moderation/messages/en.json";
import deFavorites from "@/features/favorites/messages/de.json";
import enFavorites from "@/features/favorites/messages/en.json";
import deHome from "@/features/home/messages/de.json";
import enHome from "@/features/home/messages/en.json";
import deSwitcher from "@/features/i18n-switcher/messages/de.json";
import enSwitcher from "@/features/i18n-switcher/messages/en.json";
import deLocations from "@/features/locations/messages/de.json";
import enLocations from "@/features/locations/messages/en.json";
import deOccurrences from "@/features/ore-occurrences/messages/de.json";
import enOccurrences from "@/features/ore-occurrences/messages/en.json";
import dePrices from "@/features/refinery-and-prices/messages/de.json";
import enPrices from "@/features/refinery-and-prices/messages/en.json";
import deCompare from "@/features/ore-compare/messages/de.json";
import enCompare from "@/features/ore-compare/messages/en.json";
import deOres from "@/features/ores/messages/de.json";
import enOres from "@/features/ores/messages/en.json";
import deSearch from "@/features/search/messages/de.json";
import enSearch from "@/features/search/messages/en.json";
import deSubmissions from "@/features/submissions/messages/de.json";
import enSubmissions from "@/features/submissions/messages/en.json";
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
    ...dePrices,
    ...deAuth,
    ...deFavorites,
    ...deSubmissions,
    ...deCompare,
    ...deChat,
    ...deModeration,
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
    ...enPrices,
    ...enAuth,
    ...enFavorites,
    ...enSubmissions,
    ...enCompare,
    ...enChat,
    ...enModeration,
  },
};

export type AppLocale = keyof typeof messages;

export function loadMessages(locale: AppLocale) {
  return messages[locale];
}
