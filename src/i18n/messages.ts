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
import deCompanion from "@/features/companion/messages/de.json";
import enCompanion from "@/features/companion/messages/en.json";
import deDeviceAuth from "@/features/device-auth/messages/de.json";
import enDeviceAuth from "@/features/device-auth/messages/en.json";
import deModeration from "@/features/moderation/messages/de.json";
import enModeration from "@/features/moderation/messages/en.json";
import deAdminDashboard from "@/features/admin-dashboard/messages/de.json";
import enAdminDashboard from "@/features/admin-dashboard/messages/en.json";
import deFavorites from "@/features/favorites/messages/de.json";
import enFavorites from "@/features/favorites/messages/en.json";
import deGuides from "@/features/guides/messages/de.json";
import enGuides from "@/features/guides/messages/en.json";
import deHome from "@/features/home/messages/de.json";
import enHome from "@/features/home/messages/en.json";
import deSwitcher from "@/features/i18n-switcher/messages/de.json";
import enSwitcher from "@/features/i18n-switcher/messages/en.json";
import deLoadouts from "@/features/loadouts/messages/de.json";
import enLoadouts from "@/features/loadouts/messages/en.json";
import deLocations from "@/features/locations/messages/de.json";
import enLocations from "@/features/locations/messages/en.json";
import deOccurrences from "@/features/ore-occurrences/messages/de.json";
import enOccurrences from "@/features/ore-occurrences/messages/en.json";
import dePrices from "@/features/refinery-and-prices/messages/de.json";
import enPrices from "@/features/refinery-and-prices/messages/en.json";
import dePriceTicker from "@/features/price-ticker/messages/de.json";
import enPriceTicker from "@/features/price-ticker/messages/en.json";
import deCompare from "@/features/ore-compare/messages/de.json";
import enCompare from "@/features/ore-compare/messages/en.json";
import deOres from "@/features/ores/messages/de.json";
import enOres from "@/features/ores/messages/en.json";
import deSearch from "@/features/search/messages/de.json";
import enSearch from "@/features/search/messages/en.json";
import deSignatures from "@/features/signature-profiles/messages/de.json";
import enSignatures from "@/features/signature-profiles/messages/en.json";
import deWarehouse from "@/features/warehouse/messages/de.json";
import enWarehouse from "@/features/warehouse/messages/en.json";
import deRefineryJobs from "@/features/refinery-jobs/messages/de.json";
import enRefineryJobs from "@/features/refinery-jobs/messages/en.json";
import deBlueprints from "@/features/blueprints/messages/de.json";
import enBlueprints from "@/features/blueprints/messages/en.json";
import deShips from "@/features/ships/messages/de.json";
import enShips from "@/features/ships/messages/en.json";

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
    ...dePriceTicker,
    ...deAuth,
    ...deCompanion,
    ...deDeviceAuth,
    ...deFavorites,
    ...deCompare,
    ...deChat,
    ...deModeration,
    ...deAdminDashboard,
    ...deLoadouts,
    ...deGuides,
    ...deWarehouse,
    ...deRefineryJobs,
    ...deBlueprints,
    ...deShips,
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
    ...enPriceTicker,
    ...enAuth,
    ...enCompanion,
    ...enDeviceAuth,
    ...enFavorites,
    ...enCompare,
    ...enChat,
    ...enModeration,
    ...enAdminDashboard,
    ...enLoadouts,
    ...enGuides,
    ...enWarehouse,
    ...enRefineryJobs,
    ...enBlueprints,
    ...enShips,
  },
};

export type AppLocale = keyof typeof messages;

export function loadMessages(locale: AppLocale) {
  return messages[locale];
}
