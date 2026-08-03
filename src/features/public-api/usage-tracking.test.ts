import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRedis } from "@/lib/redis";
import { statusClass, trackUsage, usageBucketKey } from "./usage-tracking";

vi.mock("@/lib/redis", () => ({ getRedis: vi.fn() }));

const mockedGetRedis = vi.mocked(getRedis);

function fakePipeline() {
  const calls: string[][] = [];
  const pipeline = {
    calls,
    hincrby: vi.fn((...args: unknown[]) => {
      calls.push(["hincrby", ...(args as string[])]);
      return pipeline;
    }),
    hset: vi.fn((...args: unknown[]) => {
      calls.push(["hset", ...(args as string[])]);
      return pipeline;
    }),
    expire: vi.fn((...args: unknown[]) => {
      calls.push(["expire", ...(args as string[])]);
      return pipeline;
    }),
    set: vi.fn((...args: unknown[]) => {
      calls.push(["set", ...(args as string[])]);
      return pipeline;
    }),
    exec: vi.fn().mockResolvedValue([]),
  };
  return pipeline;
}

describe("statusClass", () => {
  it("classifies statuses into counter fields", () => {
    expect(statusClass(200)).toBe("s2xx");
    expect(statusClass(404)).toBe("s4xx");
    expect(statusClass(429)).toBe("s429");
    expect(statusClass(500)).toBe("s5xx");
  });
});

describe("usageBucketKey", () => {
  it("buckets by UTC hour", () => {
    expect(usageBucketKey("k1", new Date("2026-08-03T13:05:00Z"))).toBe(
      "apiusage:h:k1:2026080313",
    );
  });
});

describe("trackUsage", () => {
  beforeEach(() => {
    process.env.REDIS_URL = "redis://localhost:6379";
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
    mockedGetRedis.mockReset();
  });

  it("increments hour bucket counters in one pipeline", async () => {
    const pipeline = fakePipeline();
    const redis = {
      status: "ready",
      connect: vi.fn(),
      pipeline: vi.fn(() => pipeline),
    } as unknown as ReturnType<typeof getRedis>;
    mockedGetRedis.mockReturnValue(redis);

    await trackUsage({
      keyId: "k1",
      userId: "u1",
      endpoint: "ores",
      status: 200,
      now: new Date("2026-08-03T13:05:00Z"),
    });

    const bucket = "apiusage:h:k1:2026080313";
    expect(pipeline.hincrby).toHaveBeenCalledWith(bucket, "total", 1);
    expect(pipeline.hincrby).toHaveBeenCalledWith(bucket, "s2xx", 1);
    expect(pipeline.hincrby).toHaveBeenCalledWith(bucket, "ep:ores", 1);
    expect(pipeline.hset).toHaveBeenCalledWith(bucket, "userId", "u1");
    expect(pipeline.expire).toHaveBeenCalledWith(bucket, 48 * 3600);
    expect(pipeline.set).toHaveBeenCalledWith(
      "apiusage:last:k1",
      "2026-08-03T13:05:00.000Z",
      "EX",
      40 * 24 * 3600,
    );
    expect(pipeline.exec).toHaveBeenCalled();
  });

  it("is a no-op without REDIS_URL", async () => {
    delete process.env.REDIS_URL;
    await trackUsage({
      keyId: "k1",
      userId: "u1",
      endpoint: "ores",
      status: 200,
    });
    expect(mockedGetRedis).not.toHaveBeenCalled();
  });

  it("swallows redis errors", async () => {
    mockedGetRedis.mockImplementation(() => {
      throw new Error("down");
    });
    await expect(
      trackUsage({ keyId: "k1", userId: "u1", endpoint: "ores", status: 200 }),
    ).resolves.toBeUndefined();
  });
});
