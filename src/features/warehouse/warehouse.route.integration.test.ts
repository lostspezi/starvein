import { afterAll, describe, expect, it } from "vitest";
import { POST as CREATE } from "@/app/api/warehouse/route";
import { DELETE, PATCH } from "@/app/api/warehouse/[id]/route";
import { closeMongo } from "@/lib/db";

const params = { params: Promise.resolve({ id: "entry-1" }) };

// Ohne Session-Cookie müssen alle Warehouse-Mutationen 401 liefern —
// der Happy Path ist über die Service-Tests und die UI abgedeckt.
describe("warehouse API without a session", () => {
  afterAll(async () => {
    await closeMongo();
  });

  it("rejects anonymous creation", async () => {
    const response = await CREATE(
      new Request("http://localhost/api/warehouse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          oreCode: "QUAN",
          kind: "raw",
          quantityScu: 10,
          location: { kind: "custom", label: "im Schiff" },
        }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects anonymous edits", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/warehouse/entry-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantityScu: 5 }),
      }),
      params,
    );
    expect(response.status).toBe(401);
  });

  it("rejects anonymous deletes", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/warehouse/entry-1", {
        method: "DELETE",
      }),
      params,
    );
    expect(response.status).toBe(401);
  });
});
