import { getRedis } from "@/lib/redis";

/**
 * Einfaches Fixed-Window-Rate-Limit über Redis (INCR + EXPIRE).
 * Best effort: ohne konfiguriertes/erreichbares Redis wird nicht
 * blockiert — die fachliche Absicherung (1 Stimme pro User) hängt
 * nicht am Limiter, er bremst nur Spam (CLAUDE.md §6.3).
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  if (!process.env.REDIS_URL) return true;

  try {
    const redis = getRedis();
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }

    const redisKey = `ratelimit:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    return count <= limit;
  } catch {
    return true;
  }
}
