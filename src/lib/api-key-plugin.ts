import { apiKey } from "@better-auth/api-key";

/** Prefix aller STARVEIN-API-Keys (Unterstrich laut Better-Auth-Empfehlung). */
export const API_KEY_PREFIX = "sv_";

/**
 * Anzahl der im Klartext gespeicherten Anfangszeichen (inkl. Prefix) —
 * fürs Wiedererkennen in der UI ("sv_abc12…"), der Rest liegt nur gehasht vor.
 */
export const API_KEY_START_LENGTH = 8;

/** Maximale Länge des frei wählbaren Key-Namens. */
export const API_KEY_NAME_MAX_LENGTH = 50;

/**
 * Gemeinsame apiKey-Plugin-Konfiguration für die echte Auth-Instanz
 * (src/lib/auth.ts) und Integration-Tests. Das DB-seitige Rate-Limit des
 * Plugins bleibt aus — autoritativ ist das Redis-Limit der Public API
 * (src/features/public-api).
 */
export function apiKeyPlugin() {
  return apiKey({
    defaultPrefix: API_KEY_PREFIX,
    requireName: true,
    minimumNameLength: 1,
    maximumNameLength: API_KEY_NAME_MAX_LENGTH,
    startingCharactersConfig: {
      shouldStore: true,
      charactersLength: API_KEY_START_LENGTH,
    },
    rateLimit: { enabled: false },
    // Keys laufen nicht ab; Nutzer widerrufen sie explizit über die UI.
    keyExpiration: { defaultExpiresIn: null },
  });
}
