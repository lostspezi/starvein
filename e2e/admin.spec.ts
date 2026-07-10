/**
 * Moderations-/Admin-Feature (Logged-out-Pfade): die Admin-Seite verrät
 * ihre Existenz nicht (404) und alle Moderations-Endpunkte verlangen
 * eine Session. Rollen-Guards sind über die Service-Tests abgedeckt.
 */
import { expect, test } from "@playwright/test";

test("admin page is a 404 for anonymous visitors", async ({ page }) => {
  const response = await page.goto("/en/admin");

  expect(response?.status()).toBe(404);
});

test("moderation endpoints require a session", async ({ request }) => {
  const deleteMessage = await request.delete("/api/chat/messages/some-id");
  expect(deleteMessage.status()).toBe(401);

  const timeout = await request.post("/api/chat/timeouts", {
    data: { userId: "user-1", durationMinutes: 5 },
  });
  expect(timeout.status()).toBe(401);

  const revoke = await request.delete("/api/chat/timeouts/user-1");
  expect(revoke.status()).toBe(401);

  const role = await request.patch("/api/admin/users/user-1/role", {
    data: { role: "moderator" },
  });
  expect(role.status()).toBe(401);
});
