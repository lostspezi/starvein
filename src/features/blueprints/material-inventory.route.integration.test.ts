import { afterAll, describe, expect, it } from "vitest";
import { GET, PUT } from "@/app/api/material-inventory/route";
import { closeMongo } from "@/lib/db";

// Ohne Session-Cookie müssen alle Inventar-Endpunkte 401 liefern —
// der Happy Path ist über die Repository-/Service-Tests und die UI abgedeckt.
describe("material inventory API without a session", () => {
  afterAll(async () => {
    await closeMongo();
  });

  it("rejects GET", async () => {
    const response = await GET(
      new Request("http://localhost/api/material-inventory"),
    );
    expect(response.status).toBe(401);
  });

  it("rejects PUT", async () => {
    const response = await PUT(
      new Request("http://localhost/api/material-inventory", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ materialCode: "GOLDR", quantity: 5 }),
      }),
    );
    expect(response.status).toBe(401);
  });
});
