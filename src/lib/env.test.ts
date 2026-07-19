import { describe, expect, it } from "vitest";
import { validateServerEnv } from "@/lib/env";

const completeProdEnv = {
  MONGODB_URI: "mongodb://mongo:27017/starvein",
  REDIS_URL: "redis://redis:6379",
  BETTER_AUTH_URL: "https://starvein.app",
  BETTER_AUTH_SECRET: "b3f1c9a2d47e6f5081a2b3c4d5e6f708",
  SYNC_SECRET: "ed6f82423633559fdbda164aebaba796a5a089e1",
} satisfies Record<string, string>;

function keys(result: { issues: { key: string }[] }): string[] {
  return result.issues.map((issue) => issue.key);
}

describe("validateServerEnv", () => {
  it("accepts a complete, strong production env", () => {
    const result = validateServerEnv(completeProdEnv, "production");
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("flags missing required vars in production", () => {
    const result = validateServerEnv(
      { ...completeProdEnv, MONGODB_URI: undefined, REDIS_URL: "" },
      "production",
    );
    expect(result.ok).toBe(false);
    expect(keys(result)).toEqual(
      expect.arrayContaining(["MONGODB_URI", "REDIS_URL"]),
    );
  });

  it("rejects placeholder secrets in production", () => {
    const result = validateServerEnv(
      {
        ...completeProdEnv,
        BETTER_AUTH_SECRET: "change-me",
        SYNC_SECRET: "change-me",
      },
      "production",
    );
    expect(result.ok).toBe(false);
    expect(keys(result)).toEqual(
      expect.arrayContaining(["BETTER_AUTH_SECRET", "SYNC_SECRET"]),
    );
  });

  it("rejects too-short secrets in production", () => {
    const result = validateServerEnv(
      { ...completeProdEnv, SYNC_SECRET: "short" },
      "production",
    );
    expect(result.ok).toBe(false);
    expect(keys(result)).toContain("SYNC_SECRET");
  });

  it("rejects a non-URL BETTER_AUTH_URL in production", () => {
    const result = validateServerEnv(
      { ...completeProdEnv, BETTER_AUTH_URL: "not-a-url" },
      "production",
    );
    expect(result.ok).toBe(false);
    expect(keys(result)).toContain("BETTER_AUTH_URL");
  });

  it("is lenient in development: placeholder secrets are allowed", () => {
    const result = validateServerEnv(
      {
        MONGODB_URI: "mongodb://localhost:27017/starvein",
        REDIS_URL: "redis://localhost:6379",
        BETTER_AUTH_URL: "http://localhost:3000",
        BETTER_AUTH_SECRET: "change-me",
        SYNC_SECRET: "change-me",
      },
      "development",
    );
    expect(result.ok).toBe(true);
  });

  it("still flags entirely missing required vars in development", () => {
    const result = validateServerEnv({}, "development");
    expect(result.ok).toBe(false);
    expect(keys(result)).toEqual(
      expect.arrayContaining([
        "MONGODB_URI",
        "REDIS_URL",
        "BETTER_AUTH_URL",
        "BETTER_AUTH_SECRET",
      ]),
    );
  });

  it("does not require SYNC_SECRET (sync routes are fail-closed)", () => {
    const { SYNC_SECRET: _omit, ...withoutSync } = completeProdEnv;
    void _omit;
    const result = validateServerEnv(withoutSync, "production");
    expect(result.ok).toBe(true);
  });

  it("still flags a weak SYNC_SECRET when it is set in production", () => {
    const result = validateServerEnv(
      { ...completeProdEnv, SYNC_SECRET: "change-me" },
      "production",
    );
    expect(result.ok).toBe(false);
    expect(keys(result)).toContain("SYNC_SECRET");
  });
});
