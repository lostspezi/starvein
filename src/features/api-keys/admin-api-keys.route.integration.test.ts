import { afterAll, describe, expect, it } from "vitest";
import { GET as listKeysRoute } from "@/app/api/admin/api-keys/route";
import { DELETE as deleteKeyRoute } from "@/app/api/admin/api-keys/[id]/route";
import { GET as adminStatsRoute } from "@/app/api/admin/api-keys/[id]/stats/route";
import { PATCH as banRoute } from "@/app/api/admin/users/[id]/api-key-ban/route";
import { closeMongo } from "@/lib/db";

// Ohne Session liefern alle Admin-Key-Endpunkte 401 — Rollen-Check (403)
// und Fachlogik sind über den Service-Integration-Test abgedeckt.
describe("admin api-keys routes without a session", () => {
  afterAll(async () => {
    await closeMongo();
  });

  const params = { params: Promise.resolve({ id: "abc" }) };

  it("rejects the key list", async () => {
    const response = await listKeysRoute(
      new Request("http://localhost/api/admin/api-keys"),
    );
    expect(response.status).toBe(401);
  });

  it("rejects key deletion", async () => {
    const response = await deleteKeyRoute(
      new Request("http://localhost/api/admin/api-keys/abc", {
        method: "DELETE",
      }),
      params,
    );
    expect(response.status).toBe(401);
  });

  it("rejects admin stats", async () => {
    const response = await adminStatsRoute(
      new Request("http://localhost/api/admin/api-keys/abc/stats"),
      params,
    );
    expect(response.status).toBe(401);
  });

  it("rejects the ban toggle", async () => {
    const response = await banRoute(
      new Request("http://localhost/api/admin/users/abc/api-key-ban", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ banned: true }),
      }),
      params,
    );
    expect(response.status).toBe(401);
  });
});
