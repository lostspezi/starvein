import { afterAll, describe, expect, it } from "vitest";
import { DELETE, GET, POST } from "@/app/api/blueprint-collection/route";
import { closeMongo } from "@/lib/db";

// Ohne Session-Cookie müssen alle Sammlungs-Endpunkte 401 liefern —
// der Happy Path ist über die Repository-/Service-Tests und die UI abgedeckt.
describe("blueprint collection API without a session", () => {
  afterAll(async () => {
    await closeMongo();
  });

  it("rejects GET", async () => {
    const response = await GET(
      new Request("http://localhost/api/blueprint-collection"),
    );
    expect(response.status).toBe(401);
  });

  it("rejects POST", async () => {
    const response = await POST(
      new Request("http://localhost/api/blueprint-collection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blueprintKey: "BP_CRAFT_AMRS_LaserCannon_S1" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects DELETE", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/blueprint-collection", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blueprintKey: "BP_CRAFT_AMRS_LaserCannon_S1" }),
      }),
    );
    expect(response.status).toBe(401);
  });
});
