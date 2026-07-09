/**
 * Slice-2-Happy-Path: Location-Browser.
 * Voraussetzung: docker compose up -d && pnpm seed (befüllte 'starvein'-DB).
 */
import { expect, test } from "@playwright/test";

test("browses system -> planet -> moon with breadcrumbs", async ({ page }) => {
  await page.goto("/en/locations");
  await expect(page.getByRole("heading", { name: "Locations" })).toBeVisible();

  await page.getByRole("link", { name: /Stanton/ }).click();
  await expect(page).toHaveURL(/\/en\/locations\/stanton$/);
  await expect(page.getByRole("heading", { name: "Stanton" })).toBeVisible();

  await page.getByRole("link", { name: /Crusader/ }).click();
  await expect(page).toHaveURL(/\/en\/locations\/stanton\/crusader$/);
  await expect(page.getByRole("heading", { name: "Crusader" })).toBeVisible();

  await page.getByRole("link", { name: /Yela/ }).click();
  await expect(page).toHaveURL(/\/en\/locations\/stanton\/yela$/);

  const breadcrumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(
    breadcrumbs.getByRole("link", { name: "Stanton" }),
  ).toBeVisible();
  await expect(
    breadcrumbs.getByRole("link", { name: "Crusader" }),
  ).toBeVisible();
});

test("unknown system returns 404", async ({ page }) => {
  const response = await page.goto("/en/locations/atlantis");
  expect(response?.status()).toBe(404);
});
