import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests when no redis is configured (best effort)", async () => {
    const original = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    try {
      await expect(checkRateLimit("test:user", 5, 60)).resolves.toBe(true);
    } finally {
      if (original) process.env.REDIS_URL = original;
    }
  });
});
