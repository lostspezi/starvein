import { describe, expect, it } from "vitest";
import { registerAndCheckDuplicate } from "./chat.duplicate";

describe("registerAndCheckDuplicate", () => {
  it("allows messages when no redis is configured (best effort)", async () => {
    const original = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    try {
      await expect(
        registerAndCheckDuplicate("user-1", "hallo welt"),
      ).resolves.toBe(true);
      // Auch die Wiederholung geht ohne Redis durch — Chat-Verfügbarkeit
      // hat Vorrang vor Spam-Schutz (Best-Effort-Vertrag wie checkRateLimit).
      await expect(
        registerAndCheckDuplicate("user-1", "hallo welt"),
      ).resolves.toBe(true);
    } finally {
      if (original) process.env.REDIS_URL = original;
    }
  });

  it("allows messages when redis is unreachable", async () => {
    const original = process.env.REDIS_URL;
    process.env.REDIS_URL = "redis://127.0.0.1:1";
    try {
      await expect(
        registerAndCheckDuplicate("user-1", "hallo welt"),
      ).resolves.toBe(true);
    } finally {
      if (original) process.env.REDIS_URL = original;
      else delete process.env.REDIS_URL;
    }
  });
});
