import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { closeMongo } from "@/lib/db";
import { closeRedis } from "@/lib/redis";

// Singletons zwischen Tests zurücksetzen, damit env-Änderungen greifen
afterEach(async () => {
  await closeMongo();
  await closeRedis();
});

describe("GET /api/health", () => {
  it("reports mongo 'up' against a reachable server and stays 200 without redis", async () => {
    // MONGODB_URI kommt aus dem globalen Test-Setup (Memory-Mongo)
    process.env.REDIS_URL = "redis://127.0.0.1:1";

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.services.app).toBe("up");
    expect(body.services.mongo).toBe("up");
    expect(body.services.redis).toBe("down");
    expect(body.status).toBe("degraded");
  });

  it("returns 200 with status 'degraded' when mongo and redis are unreachable", async () => {
    const originalMongoUri = process.env.MONGODB_URI;
    process.env.MONGODB_URI =
      "mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=200&connectTimeoutMS=200";
    process.env.REDIS_URL = "redis://127.0.0.1:1";

    try {
      const response = await GET();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.status).toBe("degraded");
      expect(body.services.app).toBe("up");
      expect(body.services.mongo).toBe("down");
      expect(body.services.redis).toBe("down");
    } finally {
      process.env.MONGODB_URI = originalMongoUri;
    }
  });
});
