import { afterAll, describe, expect, it } from "vitest";
import { POST as CREATE } from "@/app/api/refinery-jobs/route";
import { DELETE, PATCH } from "@/app/api/refinery-jobs/[id]/route";
import { POST as COLLECT } from "@/app/api/refinery-jobs/[id]/collect/route";
import { closeMongo } from "@/lib/db";

const params = { params: Promise.resolve({ id: "job-1" }) };

// Ohne Session-Cookie müssen alle Job-Mutationen 401 liefern —
// der Happy Path ist über die Service-Tests und die UI abgedeckt.
describe("refinery jobs API without a session", () => {
  afterAll(async () => {
    await closeMongo();
  });

  it("rejects anonymous creation", async () => {
    const response = await CREATE(
      new Request("http://localhost/api/refinery-jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          terminalId: 32,
          methodCode: "DINYX",
          items: [{ oreCode: "QUAN", quantityScu: 32 }],
          durationMinutes: 90,
        }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects anonymous edits", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/refinery-jobs/job-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ durationMinutes: 120 }),
      }),
      params,
    );
    expect(response.status).toBe(401);
  });

  it("rejects anonymous deletes", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/refinery-jobs/job-1", {
        method: "DELETE",
      }),
      params,
    );
    expect(response.status).toBe(401);
  });

  it("rejects anonymous collection", async () => {
    const response = await COLLECT(
      new Request("http://localhost/api/refinery-jobs/job-1/collect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      params,
    );
    expect(response.status).toBe(401);
  });
});
