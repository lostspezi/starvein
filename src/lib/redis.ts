import Redis from "ioredis";

/**
 * ioredis-Singleton mit lazyConnect: Es wird erst beim ersten Kommando
 * verbunden, damit die App auch ohne laufendes Redis bootet.
 */
const globalForRedis = globalThis as unknown as {
  _redisClient?: Redis;
};

function getRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  return url;
}

export function getRedis(): Redis {
  if (!globalForRedis._redisClient) {
    globalForRedis._redisClient = new Redis(getRedisUrl(), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    // Fehler-Events schlucken — Erreichbarkeit wird über pingRedis geprüft
    globalForRedis._redisClient.on("error", () => {});
  }
  return globalForRedis._redisClient;
}

export async function pingRedis(timeoutMs: number): Promise<"up" | "down"> {
  try {
    const redis = getRedis();
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }
    const pong = await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("redis ping timeout")), timeoutMs),
      ),
    ]);
    return pong === "PONG" ? "up" : "down";
  } catch {
    return "down";
  }
}

export async function closeRedis(): Promise<void> {
  const client = globalForRedis._redisClient;
  if (!client) return;
  globalForRedis._redisClient = undefined;
  try {
    await client.quit();
  } catch {
    client.disconnect();
  }
}
