/** Slice-0-Happy-Path: Locale-Routing, Sprachwechsel, Health-Endpoint. */
import { expect, test } from "@playwright/test";

test("redirects / to /de for German Accept-Language", async ({ browser }) => {
  const context = await browser.newContext({ locale: "de-DE" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page).toHaveURL(/\/de$/);
  await context.close();
});

test("locale switcher navigates from /de to /en", async ({ page }) => {
  await page.goto("/de");
  await expect(
    page.getByText("deiner freien Mining-Referenz für Star Citizen", {
      exact: false,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "English" }).click();

  await expect(page).toHaveURL(/\/en$/);
  await expect(
    page.getByText("your free mining reference for Star Citizen", {
      exact: false,
    }),
  ).toBeVisible();
});

test("clickable buttons show a pointer cursor", async ({ page }) => {
  await page.goto("/en");

  const cursor = await page
    .getByRole("button", { name: "Deutsch" })
    .evaluate((el) => getComputedStyle(el).cursor);

  expect(cursor).toBe("pointer");
});

test("GET /api/health responds 200 with app up", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.services.app).toBe("up");
  expect(["ok", "degraded"]).toContain(body.status);
});
