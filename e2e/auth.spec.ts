/**
 * Slice-6-Happy-Path (Logged-out-Pfade): Discord-Login-Button, geschützte
 * Favoriten-API, Favoriten-Seite mit Login-Hinweis. Der echte OAuth-Flow
 * läuft gegen Discord und ist bewusst nicht Teil der deterministischen E2E.
 */
import { expect, test } from "@playwright/test";

test("header offers a Discord sign-in", async ({ page }) => {
  await page.goto("/en");
  await expect(
    page.getByRole("button", { name: "Sign in with Discord" }),
  ).toBeVisible();
});

test("favorites page asks anonymous users to sign in", async ({ page }) => {
  await page.goto("/en/favorites");
  await expect(
    page.getByText("Sign in with Discord to save favorite locations."),
  ).toBeVisible();
});

test("favorites API rejects anonymous requests", async ({ request }) => {
  const listResponse = await request.get("/api/favorites");
  expect(listResponse.status()).toBe(401);

  const addResponse = await request.post("/api/favorites", {
    data: { systemCode: "STANTON", bodySlug: "daymar" },
  });
  expect(addResponse.status()).toBe(401);
});

test("body pages hide the favorite button for anonymous users", async ({
  page,
}) => {
  await page.goto("/en/locations/stanton/daymar");
  await expect(page.getByRole("heading", { name: "Daymar" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /favorite/i }),
  ).not.toBeVisible();
});
