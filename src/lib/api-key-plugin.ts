import { apiKey } from "@better-auth/api-key";
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";

/** Prefix aller STARVEIN-API-Keys (Unterstrich laut Better-Auth-Empfehlung). */
export const API_KEY_PREFIX = "sv_";

/**
 * Anzahl der im Klartext gespeicherten Anfangszeichen (inkl. Prefix) —
 * fürs Wiedererkennen in der UI ("sv_abc12…"), der Rest liegt nur gehasht vor.
 */
export const API_KEY_START_LENGTH = 8;

/** Maximale Länge des frei wählbaren Key-Namens. */
export const API_KEY_NAME_MAX_LENGTH = 50;

/** Obergrenze aktiver Keys pro Nutzer (Rotation ohne Downtime möglich). */
export const MAX_API_KEYS_PER_USER = 5;

/**
 * Gemeinsame apiKey-Plugin-Konfiguration für die echte Auth-Instanz
 * (src/lib/auth.ts) und Integration-Tests. Das DB-seitige Rate-Limit des
 * Plugins bleibt aus — autoritativ ist das Redis-Limit der Public API
 * (src/features/public-api).
 */
/**
 * Erzwingt Key-Limit und Erstellungs-Sperre vor jedem Create — als
 * globaler before-Hook, damit auch die vom Plugin gemounteten
 * HTTP-Endpoints (/api/auth/api-key/create) beides nicht umgehen können.
 */
export function apiKeyCapHook() {
  return createAuthMiddleware(async (ctx) => {
    if (ctx.path !== "/api-key/create") return;

    const session = await getSessionFromCtx(ctx);
    const userId =
      session?.user.id ?? (ctx.body as { userId?: string } | undefined)?.userId;
    // Ohne Nutzer wirft der Endpoint selbst UNAUTHORIZED
    if (!userId) return;

    const user = (await ctx.context.adapter.findOne({
      model: "user",
      where: [{ field: "id", value: userId }],
    })) as { apiKeysBanned?: unknown } | null;
    if (user?.apiKeysBanned === true) {
      throw new APIError("FORBIDDEN", {
        message: "api key creation banned",
        code: "API_KEYS_BANNED",
      });
    }

    const count = await ctx.context.adapter.count({
      model: "apikey",
      where: [{ field: "referenceId", value: userId }],
    });
    if (count >= MAX_API_KEYS_PER_USER) {
      throw new APIError("FORBIDDEN", {
        message: "key limit reached",
        code: "KEY_LIMIT_REACHED",
      });
    }
  });
}

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
