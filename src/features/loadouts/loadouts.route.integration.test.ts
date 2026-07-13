import { afterAll, describe, expect, it } from "vitest";
import { POST as CREATE } from "@/app/api/loadouts/route";
import { DELETE, PATCH } from "@/app/api/loadouts/[id]/route";
import { POST as VOTE } from "@/app/api/loadouts/[id]/vote/route";
import { closeMongo } from "@/lib/db";

const params = { params: Promise.resolve({ id: "loadout-1" }) };

// Ohne Session-Cookie müssen alle Loadout-Mutationen 401 liefern —
// der Happy Path ist über die Service-Tests und die UI abgedeckt.
describe("loadouts API without a session", () => {
  afterAll(async () => {
    await closeMongo();
  });

  it("rejects anonymous creation", async () => {
    const response = await CREATE(
      new Request("http://localhost/api/loadouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Test",
          method: "ship",
          vehicleCode: "mole",
          hardpoints: [],
          gadgetCodes: [],
          isPublic: false,
        }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects anonymous edits", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/loadouts/loadout-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Neu" }),
      }),
      params,
    );
    expect(response.status).toBe(401);
  });

  it("rejects anonymous deletes", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/loadouts/loadout-1", {
        method: "DELETE",
      }),
      params,
    );
    expect(response.status).toBe(401);
  });

  it("rejects anonymous votes", async () => {
    const response = await VOTE(
      new Request("http://localhost/api/loadouts/loadout-1/vote", {
        method: "POST",
      }),
      params,
    );
    expect(response.status).toBe(401);
  });
});
