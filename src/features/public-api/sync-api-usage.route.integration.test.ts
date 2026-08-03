import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/sync-api-usage/route";
import { aggregateApiUsage } from "@/features/public-api/usage-aggregation.service";
import { closeMongo } from "@/lib/db";

vi.mock("@/features/public-api/usage-aggregation.service", () => ({
  aggregateApiUsage: vi.fn().mockResolvedValue({ flushedBuckets: 2 }),
}));

vi.mock("@/lib/redis", () => ({
  getRedis: vi.fn(() => ({ status: "ready", connect: vi.fn() })),
}));

const mockedAggregate = vi.mocked(aggregateApiUsage);

function request(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/sync-api-usage", {
    method: "POST",
    headers,
  });
}

describe("POST /api/sync-api-usage", () => {
  afterEach(() => {
    mockedAggregate.mockClear();
    delete process.env.SYNC_SECRET;
    delete process.env.REDIS_URL;
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("rejects requests without the sync secret", async () => {
    process.env.SYNC_SECRET = "cron-secret";
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mockedAggregate).not.toHaveBeenCalled();
  });

  it("fails closed when no secret is configured", async () => {
    const response = await POST(request({ "x-sync-secret": "anything" }));
    expect(response.status).toBe(401);
  });

  it("aggregates when authorized and redis is configured", async () => {
    process.env.SYNC_SECRET = "cron-secret";
    process.env.REDIS_URL = "redis://localhost:6379";
    const response = await POST(request({ "x-sync-secret": "cron-secret" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, flushedBuckets: 2 });
    expect(mockedAggregate).toHaveBeenCalledOnce();
  });

  it("no-ops without REDIS_URL", async () => {
    process.env.SYNC_SECRET = "cron-secret";
    const response = await POST(request({ "x-sync-secret": "cron-secret" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, flushedBuckets: 0 });
    expect(mockedAggregate).not.toHaveBeenCalled();
  });
});
