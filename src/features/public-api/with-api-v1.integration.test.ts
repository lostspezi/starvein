import { ObjectId } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET, OPTIONS } from "@/app/api/v1/ores/route";
import { createKey } from "@/features/api-keys/api-keys.service";
import { upsertOres } from "@/features/ores/ores.repository";
import type { Ore } from "@/features/ores/ores.schema";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { closeMongo, getDb } from "@/lib/db";

const quan: Ore = {
  code: "QUAN",
  name_de: "Quantainium",
  name_en: "Quantainium",
  rarityTier: "legendary",
  mineableBy: { ship: true, roc: false, fps: false },
};

/**
 * Kern-Contract der öffentlichen v1: Key-Pflicht, Envelope, CORS- und
 * Rate-Limit-Header auf jeder Antwort. Redis läuft im Test nicht —
 * das Rate-Limit ist fail-open, die Header müssen trotzdem da sein.
 */
describe("withApiV1 via GET /api/v1/ores", () => {
  let apiKey: string;

  beforeAll(async () => {
    const db = await getDb();
    await upsertOres(db, [quan]);
    const created = await createKey(
      db,
      new ObjectId().toHexString(),
      "v1-test",
    );
    apiKey = created.key;
  });

  afterAll(async () => {
    await closeMongo();
  });

  function v1Request(headers: Record<string, string> = {}) {
    return new Request("http://localhost/api/v1/ores", { headers });
  }

  it("rejects requests without a key (CORS headers included)", async () => {
    const response = await GET(v1Request());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "invalid api key" });
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("rejects garbage keys without the sv_ prefix", async () => {
    const response = await GET(
      v1Request({ authorization: "Bearer totally-wrong" }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects revoked/unknown sv_ keys", async () => {
    const response = await GET(
      v1Request({ authorization: "Bearer sv_doesnotexist" }),
    );
    expect(response.status).toBe(401);
  });

  it("serves enveloped data with rate-limit headers for a valid key", async () => {
    const response = await GET(
      v1Request({ authorization: `Bearer ${apiKey}` }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.meta.patchVersion).toBe(CURRENT_PATCH_VERSION);
    expect(typeof body.meta.generatedAt).toBe("string");
    expect(body.data.some((ore: { code: string }) => ore.code === "QUAN")).toBe(
      true,
    );

    expect(response.headers.get("x-ratelimit-limit")).toBe("120");
    expect(response.headers.get("x-ratelimit-remaining")).toBeTruthy();
    expect(response.headers.get("x-ratelimit-reset")).toBeTruthy();
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("accepts the key via x-api-key header too", async () => {
    const response = await GET(v1Request({ "x-api-key": apiKey }));
    expect(response.status).toBe(200);
  });

  it("answers OPTIONS preflight without a key", async () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("maps handler errors to a flat 500", async () => {
    const { withApiV1 } = await import("@/features/public-api/with-api-v1");
    const boom = withApiV1("boom", async () => {
      throw new Error("kaputt");
    });
    const response = await boom(
      v1Request({ authorization: `Bearer ${apiKey}` }),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "internal error" });
    expect(response.headers.get("x-ratelimit-limit")).toBe("120");
  });
});
