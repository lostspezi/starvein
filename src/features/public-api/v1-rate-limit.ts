import { getRedis } from "@/lib/redis";

export const V1_RATE_LIMIT = 120;
export const V1_RATE_WINDOW_SECONDS = 60;

export type V1RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetEpochSeconds: number;
};

function failOpen(nowMs: number): V1RateLimitResult {
  return {
    allowed: true,
    limit: V1_RATE_LIMIT,
    remaining: V1_RATE_LIMIT,
    resetEpochSeconds: Math.ceil(nowMs / 1000) + V1_RATE_WINDOW_SECONDS,
  };
}

/**
 * Fixed-Window-Limit pro API-Key (Redis INCR + EXPIRE, wie
 * src/lib/rate-limit.ts) — zusätzlich mit Remaining/Reset für die
 * X-RateLimit-Header. Fail-open wie alle Limits der Seite: ein
 * Redis-Ausfall legt die API nicht lahm, Requests bleiben über den
 * Key zuordenbar und der Edge (Cloudflare) bremst weiterhin.
 */
export async function checkV1RateLimit(
  keyId: string,
  nowMs: number = Date.now(),
): Promise<V1RateLimitResult> {
  if (!process.env.REDIS_URL) return failOpen(nowMs);

  try {
    const redis = getRedis();
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }

    const redisKey = `ratelimit:v1:${keyId}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, V1_RATE_WINDOW_SECONDS);
    }

    let ttlMs = await redis.pttl(redisKey);
    if (ttlMs < 0) {
      // Key ohne TTL (z.B. EXPIRE nach Crash verloren) — Fenster neu setzen
      await redis.expire(redisKey, V1_RATE_WINDOW_SECONDS);
      ttlMs = V1_RATE_WINDOW_SECONDS * 1000;
    }

    return {
      allowed: count <= V1_RATE_LIMIT,
      limit: V1_RATE_LIMIT,
      remaining: Math.max(0, V1_RATE_LIMIT - count),
      resetEpochSeconds: Math.ceil((nowMs + ttlMs) / 1000),
    };
  } catch {
    return failOpen(nowMs);
  }
}

/** X-RateLimit-Header für jede v1-Antwort (auch 401/429). */
export function rateLimitHeaders(
  result: V1RateLimitResult,
): Record<string, string> {
  return {
    "x-ratelimit-limit": String(result.limit),
    "x-ratelimit-remaining": String(result.remaining),
    "x-ratelimit-reset": String(result.resetEpochSeconds),
  };
}
