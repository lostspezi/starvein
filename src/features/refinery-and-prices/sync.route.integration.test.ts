import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/sync-uex/route";
import { closeMongo } from "@/lib/db";
import { UEX_TEST_BASE_URL, uexServer } from "@/test/uex-server";

function request(secret?: string): Request {
  return new Request("http://localhost/api/sync-uex", {
    method: "POST",
    headers: secret ? { "x-sync-secret": secret } : {},
  });
}

describe("POST /api/sync-uex", () => {
  beforeAll(() => {
    uexServer.listen({ onUnhandledRequest: "error" });
    process.env.UEX_API_BASE_URL = UEX_TEST_BASE_URL;
    process.env.SYNC_SECRET = "test-secret";
  });

  afterEach(() => {
    uexServer.resetHandlers();
  });

  afterAll(async () => {
    uexServer.close();
    delete process.env.SYNC_SECRET;
    await closeMongo();
  });

  it("rejects requests without the sync secret", async () => {
    const response = await POST(request());
    expect(response.status).toBe(401);
  });

  it("rejects requests with a wrong secret", async () => {
    const response = await POST(request("nope"));
    expect(response.status).toBe(401);
  });

  it("rejects everything when no secret is configured (fail closed)", async () => {
    delete process.env.SYNC_SECRET;
    const response = await POST(request("test-secret"));
    expect(response.status).toBe(401);
    process.env.SYNC_SECRET = "test-secret";
  });

  it("runs the sync with the correct secret", async () => {
    const response = await POST(request("test-secret"));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.methods).toBe(1);
    expect(typeof body.syncedAt).toBe("string");
  });
});
