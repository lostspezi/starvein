import { afterAll, describe, expect, it } from "vitest";
import { DELETE, GET, POST } from "@/app/api/favorites/route";
import { closeMongo } from "@/lib/db";

// Ohne Session-Cookie müssen alle Favoriten-Endpunkte 401 liefern —
// der Happy Path ist über die Repository-Tests und die UI abgedeckt.
describe("favorites API without a session", () => {
  afterAll(async () => {
    await closeMongo();
  });

  it("rejects GET", async () => {
    const response = await GET(new Request("http://localhost/api/favorites"));
    expect(response.status).toBe(401);
  });

  it("rejects POST", async () => {
    const response = await POST(
      new Request("http://localhost/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ systemCode: "STANTON", bodySlug: "daymar" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects DELETE", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/favorites", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ systemCode: "STANTON", bodySlug: "daymar" }),
      }),
    );
    expect(response.status).toBe(401);
  });
});
