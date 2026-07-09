import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { MongoClient } from "mongodb";

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
  plugins: [nextCookies()],
});
