import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRedis } from "@/lib/redis";
import {
  V1_RATE_LIMIT,
  V1_RATE_WINDOW_SECONDS,
  checkV1RateLimit,
  rateLimitHeaders,
} from "./v1-rate-limit";

vi.mock("@/lib/redis", () => ({ getRedis: vi.fn() }));

const mockedGetRedis = vi.mocked(getRedis);

function fakeRedis(overrides: Record<string, unknown> = {}) {
  return {
    status: "ready",
    connect: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    pttl: vi.fn().mockResolvedValue(60_000),
    ...overrides,
  } as unknown as ReturnType<typeof getRedis>;
}

describe("checkV1RateLimit", () => {
  beforeEach(() => {
    process.env.REDIS_URL = "redis://localhost:6379";
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
    mockedGetRedis.mockReset();
  });

  it("allows requests under the limit and reports remaining", async () => {
    const redis = fakeRedis({ incr: vi.fn().mockResolvedValue(5) });
    mockedGetRedis.mockReturnValue(redis);

    const result = await checkV1RateLimit("key-1", 1_000_000);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(V1_RATE_LIMIT);
    expect(result.remaining).toBe(V1_RATE_LIMIT - 5);
    expect(redis.incr).toHaveBeenCalledWith("ratelimit:v1:key-1");
  });

  it("sets the expiry on the first request of a window", async () => {
    const redis = fakeRedis({ incr: vi.fn().mockResolvedValue(1) });
    mockedGetRedis.mockReturnValue(redis);

    await checkV1RateLimit("key-1", 1_000_000);
    expect(redis.expire).toHaveBeenCalledWith(
      "ratelimit:v1:key-1",
      V1_RATE_WINDOW_SECONDS,
    );
  });

  it("blocks the request over the limit with remaining 0", async () => {
    const redis = fakeRedis({
      incr: vi.fn().mockResolvedValue(V1_RATE_LIMIT + 1),
      pttl: vi.fn().mockResolvedValue(30_000),
    });
    mockedGetRedis.mockReturnValue(redis);

    const result = await checkV1RateLimit("key-1", 1_000_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    // Reset = jetzt + verbleibende Fenster-TTL, aufgerundet
    expect(result.resetEpochSeconds).toBe(
      Math.ceil((1_000_000 + 30_000) / 1000),
    );
  });

  it("fails open without REDIS_URL", async () => {
    delete process.env.REDIS_URL;
    const result = await checkV1RateLimit("key-1", 1_000_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(V1_RATE_LIMIT);
    expect(mockedGetRedis).not.toHaveBeenCalled();
  });

  it("fails open when redis errors", async () => {
    const redis = fakeRedis({
      incr: vi.fn().mockRejectedValue(new Error("down")),
    });
    mockedGetRedis.mockReturnValue(redis);

    const result = await checkV1RateLimit("key-1", 1_000_000);
    expect(result.allowed).toBe(true);
  });
});

describe("rateLimitHeaders", () => {
  it("maps the result to X-RateLimit headers", () => {
    expect(
      rateLimitHeaders({
        allowed: true,
        limit: 120,
        remaining: 7,
        resetEpochSeconds: 1234,
      }),
    ).toEqual({
      "x-ratelimit-limit": "120",
      "x-ratelimit-remaining": "7",
      "x-ratelimit-reset": "1234",
    });
  });
});
