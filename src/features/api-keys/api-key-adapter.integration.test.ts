import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  API_KEY_PREFIX,
  API_KEY_START_LENGTH,
  apiKeyPlugin,
} from "@/lib/api-key-plugin";
import { uniqueDbName } from "@/test/factories";

/**
 * Tripwire-Test für den Better-Auth-Mongo-Adapter in Kombination mit dem
 * apiKey-Plugin (bekannte Adapter-Bugs: better-auth#7892 — verifyApiKey
 * schrieb referenceId von ObjectId auf String um, Keys verschwanden aus
 * list; better-auth#6800 — `_id` immutable beim Update). Schlägt dieser
 * Roundtrip fehl, darf nichts auf dem Plugin aufgebaut werden.
 *
 * `/api-key/list` verlangt eine Session (sessionMiddleware, kein
 * serverseitiger userId-Parameter) — daher werden die Session-Cookies aus
 * dem Sign-up durchgereicht, wie es auch die Account-Routes tun.
 */
describe("api-key plugin against mongodb adapter", () => {
  let client: MongoClient;
  let auth: ReturnType<typeof buildAuth>;
  let userId: string;
  let sessionHeaders: Headers;

  function buildAuth(dbName: string) {
    return betterAuth({
      database: mongodbAdapter(client.db(dbName)),
      secret: "api-key-adapter-test-secret-0123456789abcdef",
      baseURL: "http://localhost:3000",
      emailAndPassword: { enabled: true },
      plugins: [apiKeyPlugin()],
    });
  }

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI as string);
    await client.connect();
    auth = buildAuth(uniqueDbName("api-key-adapter"));

    const signUp = await auth.api.signUpEmail({
      body: {
        name: "Test Miner",
        email: "miner@example.com",
        password: "super-secret-password",
      },
      returnHeaders: true,
    });
    userId = signUp.response.user.id;
    sessionHeaders = new Headers({
      cookie: signUp.headers.get("set-cookie") ?? "",
    });
  });

  afterAll(async () => {
    await client.close();
  });

  it("survives the create → verify → list → update → delete roundtrip", async () => {
    const created = await auth.api.createApiKey({
      body: { name: "tripwire", userId },
    });

    expect(created.key).toMatch(new RegExp(`^${API_KEY_PREFIX}`));
    expect(created.start).toBe(created.key.slice(0, API_KEY_START_LENGTH));
    expect(created.name).toBe("tripwire");

    const verified = await auth.api.verifyApiKey({
      body: { key: created.key },
    });
    expect(verified.valid).toBe(true);
    expect(verified.key?.referenceId).toBe(userId);
    expect(typeof verified.key?.referenceId).toBe("string");

    // Regression better-auth#7892: nach verifyApiKey (schreibt lastRequest)
    // muss der Key weiterhin über list auffindbar sein.
    const listed = await auth.api.listApiKeys({ headers: sessionHeaders });
    expect(listed.apiKeys).toHaveLength(1);
    expect(listed.apiKeys[0]?.id).toBe(created.id);
    expect(listed.apiKeys[0]?.start).toBe(created.start);
    // Niemals das Klartext-Key-Material in der Liste
    expect(JSON.stringify(listed)).not.toContain(created.key);

    // Regression better-auth#6800: Update darf am Mongo-`_id` nicht scheitern
    const updated = await auth.api.updateApiKey({
      body: { keyId: created.id, userId, name: "renamed" },
    });
    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe("renamed");

    const verifiedAfterUpdate = await auth.api.verifyApiKey({
      body: { key: created.key },
    });
    expect(verifiedAfterUpdate.valid).toBe(true);

    // `/api-key/delete` verlangt wie list eine Session (sessionMiddleware)
    await auth.api.deleteApiKey({
      body: { keyId: created.id },
      headers: sessionHeaders,
    });
    const verifiedAfterDelete = await auth.api.verifyApiKey({
      body: { key: created.key },
    });
    expect(verifiedAfterDelete.valid).toBe(false);
  });

  it("rejects names longer than 50 characters", async () => {
    await expect(
      auth.api.createApiKey({
        body: { name: "x".repeat(51), userId },
      }),
    ).rejects.toMatchObject({ body: { code: "INVALID_NAME_LENGTH" } });
  });

  it("requires a name for new keys", async () => {
    await expect(
      auth.api.createApiKey({ body: { userId } }),
    ).rejects.toMatchObject({ body: { code: "NAME_REQUIRED" } });
  });
});
