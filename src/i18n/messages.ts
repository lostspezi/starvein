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

const messages = {
  de: { ...deCommon, ...deHome, ...deSwitcher },
  en: { ...enCommon, ...enHome, ...enSwitcher },
};

export type AppLocale = keyof typeof messages;

export function loadMessages(locale: AppLocale) {
  return messages[locale];
}
