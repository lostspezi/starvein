/**
 * Admin-Dashboard (Logged-out-Pfade): die Seite verrät ihre Existenz nicht
 * (404 für Anonyme UND Nicht-Admins) und der Nav-Access-Endpoint verlangt eine
 * Session. Die eigentliche Discord-ID-Prüfung ist über die Service-/Route-Unit-
 * und Integrationstests abgedeckt.
 */
import { expect, test } from "@playwright/test";

test("admin dashboard is a 404 for anonymous visitors", async ({ page }) => {
  const response = await page.goto("/en/admin/dashboard");

  expect(response?.status()).toBe(404);
});

test("dashboard access endpoint requires a session", async ({ request }) => {
  const res = await request.get("/api/admin/dashboard/access");
  expect(res.status()).toBe(401);
});
