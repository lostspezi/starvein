import { afterAll, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/account/api-keys/route";
import { DELETE } from "@/app/api/account/api-keys/[id]/route";
import { GET as getStats } from "@/app/api/account/api-keys/[id]/stats/route";
import { closeMongo } from "@/lib/db";

// Ohne Session-Cookie liefern alle Key-Management-Endpunkte 401 —
// die Fachlogik (Cap, Ownership, Show-once) deckt der Service-Test ab.
describe("api-keys API without a session", () => {
  afterAll(async () => {
    await closeMongo();
  });

  it("rejects GET", async () => {
    const response = await GET(
      new Request("http://localhost/api/account/api-keys"),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("rejects POST", async () => {
    const response = await POST(
      new Request("http://localhost/api/account/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "bot" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects stats GET", async () => {
    const response = await getStats(
      new Request("http://localhost/api/account/api-keys/abc/stats"),
      { params: Promise.resolve({ id: "abc" }) },
    );
    expect(response.status).toBe(401);
  });

  it("rejects DELETE", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/account/api-keys/abc", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "abc" }) },
    );
    expect(response.status).toBe(401);
  });
});
