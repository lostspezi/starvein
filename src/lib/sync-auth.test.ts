import { afterEach, describe, expect, it } from "vitest";
import { isAuthorizedSyncRequest } from "@/lib/sync-auth";

function request(secret?: string): Request {
  return new Request("http://localhost/api/sync", {
    method: "POST",
    headers: secret === undefined ? {} : { "x-sync-secret": secret },
  });
}

describe("isAuthorizedSyncRequest", () => {
  afterEach(() => {
    delete process.env.SYNC_SECRET;
  });

  it("rejects when SYNC_SECRET is not configured (fail closed)", () => {
    delete process.env.SYNC_SECRET;
    expect(isAuthorizedSyncRequest(request("anything"))).toBe(false);
  });

  it("rejects when the header is missing", () => {
    process.env.SYNC_SECRET = "top-secret";
    expect(isAuthorizedSyncRequest(request())).toBe(false);
  });

  it("rejects a wrong secret", () => {
    process.env.SYNC_SECRET = "top-secret";
    expect(isAuthorizedSyncRequest(request("nope"))).toBe(false);
  });

  it("rejects a secret of different length", () => {
    process.env.SYNC_SECRET = "top-secret";
    expect(isAuthorizedSyncRequest(request("top-secret-longer"))).toBe(false);
  });

  it("accepts the correct secret", () => {
    process.env.SYNC_SECRET = "top-secret";
    expect(isAuthorizedSyncRequest(request("top-secret"))).toBe(true);
  });

  it("accepts a realistic high-entropy hex secret", () => {
    const secret = "ed6f82423633559fdbda164aebaba796a5a089e1";
    process.env.SYNC_SECRET = secret;
    expect(isAuthorizedSyncRequest(request(secret))).toBe(true);
    expect(isAuthorizedSyncRequest(request(secret.replace(/.$/, "0")))).toBe(
      false,
    );
  });
});
