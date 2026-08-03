/**
 * API-Key-Verwaltung: Ohne Session zeigt die Account-Seite den
 * Login-Hinweis, die Management-Endpunkte liefern 401. Der eingeloggte
 * Flow (Key erstellen → v1 nutzen → Stats sehen) ist über die
 * Integration-Tests der Slices api-keys/public-api abgedeckt —
 * Discord-OAuth läuft nicht headless.
 */
import { expect, test } from "@playwright/test";

test("api keys page asks for sign-in without a session", async ({ page }) => {
  await page.goto("/en/account/api-keys");

  await expect(page.getByRole("heading", { name: "API keys" })).toBeVisible();
  await expect(
    page.getByText("Please sign in to manage API keys."),
  ).toBeVisible();
});

test("key management endpoints require a session", async ({ request }) => {
  expect((await request.get("/api/account/api-keys")).status()).toBe(401);
  expect(
    (
      await request.post("/api/account/api-keys", {
        data: { name: "bot" },
      })
    ).status(),
  ).toBe(401);
  expect((await request.delete("/api/account/api-keys/abc123")).status()).toBe(
    401,
  );
  expect(
    (await request.get("/api/account/api-keys/abc123/stats")).status(),
  ).toBe(401);
});
