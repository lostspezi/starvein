import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { bearer, deviceAuthorization } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import { resolveTrustedOrigins } from "@/lib/auth-config";

/** Einzige Client-ID, die den Device-Flow nutzen darf (Desktop-Companion). */
export const DEVICE_CLIENT_ID = "starvein-companion";

/**
 * Better-Auth-Konfiguration (CLAUDE.md §8). V1: nur Discord —
 * Twitch/Google werden später als weitere socialProviders ergänzt.
 * Eigener MongoClient (nicht der App-Singleton), da Better Auth die
 * Instanz zur Konfigurationszeit braucht; verbunden wird erst lazily.
 */
const client = new MongoClient(
  process.env.MONGODB_URI ?? "mongodb://localhost:27017/starvein",
);

export const auth = betterAuth({
  database: mongodbAdapter(client.db()),
  // CSRF-/Open-Redirect-Schutz: neben der Base-URL erlaubte Origins.
  // Erweiterbar über BETTER_AUTH_TRUSTED_ORIGINS (siehe auth-config.ts).
  trustedOrigins: resolveTrustedOrigins(),
  advanced: {
    ipAddress: {
      // Hinter Cloudflare/Caddy die echte Client-IP auflösen, damit das
      // Better-Auth-Rate-Limit pro IP greift (sonst teilen sich alle Nutzer
      // einen Bucket = die Proxy-IP).
      ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
    },
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    },
  },
  user: {
    additionalFields: {
      // Rollenmodell vorbereitet für moderator/admin ohne Schema-Migration
      role: {
        type: "string",
        defaultValue: "user",
        input: false,
      },
    },
  },
  plugins: [
    // RFC-8628-Device-Flow für die Desktop-App: Code anzeigen, im Browser
    // per Discord-Session bestätigen (/[locale]/device), Token abholen.
    deviceAuthorization({
      expiresIn: "30m",
      interval: "5s",
      validateClient: (clientId) => clientId === DEVICE_CLIENT_ID,
    }),
    // Erlaubt `Authorization: Bearer <session-token>` — damit funktionieren
    // alle bestehenden Route-Handler unverändert auch für die Desktop-App.
    bearer(),
    // nextCookies muss laut Better-Auth-Doku das letzte Plugin sein.
    nextCookies(),
  ],
});
