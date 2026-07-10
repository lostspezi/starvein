import { afterAll, describe, expect, it } from "vitest";
import { DELETE as deleteMessage } from "@/app/api/chat/messages/[id]/route";
import { DELETE as revokeTimeout } from "@/app/api/chat/timeouts/[userId]/route";
import { POST as postTimeout } from "@/app/api/chat/timeouts/route";
import { PATCH as patchRole } from "@/app/api/admin/users/[id]/role/route";
import { closeMongo } from "@/lib/db";

// Ohne Session-Cookie müssen alle Moderations-Endpunkte 401 liefern —
// die Rollen-Guards selbst sind über die Service-Tests abgedeckt.
describe("moderation APIs without a session", () => {
  afterAll(async () => {
    await closeMongo();
  });

  it("rejects DELETE /api/chat/messages/[id]", async () => {
    const response = await deleteMessage(
      new Request("http://localhost/api/chat/messages/msg-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "msg-1" }) },
    );
    expect(response.status).toBe(401);
  });

  it("rejects POST /api/chat/timeouts", async () => {
    const response = await postTimeout(
      new Request("http://localhost/api/chat/timeouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "user-1", durationMinutes: 5 }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects DELETE /api/chat/timeouts/[userId]", async () => {
    const response = await revokeTimeout(
      new Request("http://localhost/api/chat/timeouts/user-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ userId: "user-1" }) },
    );
    expect(response.status).toBe(401);
  });

  it("rejects PATCH /api/admin/users/[id]/role", async () => {
    const response = await patchRole(
      new Request("http://localhost/api/admin/users/user-1/role", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "moderator" }),
      }),
      { params: Promise.resolve({ id: "user-1" }) },
    );
    expect(response.status).toBe(401);
  });
});
