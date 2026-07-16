/**
 * Slice-2-Happy-Path: Location-Browser.
 * Voraussetzung: docker compose up -d && pnpm seed && pnpm sync:wiki
 * (befüllte 'starvein'-DB, Bodies/Vorkommen aus dem Wiki-Sync).
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

test("outpost page shows the full ancestor chain in breadcrumbs", async ({
  page,
}) => {
  await page.goto("/en/locations/stanton/arccorp-mining-area-045");

  await expect(
    page.getByRole("heading", { name: "ArcCorp Mining Area 045" }),
  ).toBeVisible();
  await expect(page.getByText("Outpost")).toBeVisible();

  const breadcrumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(
    breadcrumbs.getByRole("link", { name: "Stanton" }),
  ).toBeVisible();
  await expect(
    breadcrumbs.getByRole("link", { name: "ArcCorp", exact: true }),
  ).toBeVisible();
  await expect(breadcrumbs.getByRole("link", { name: "Wala" })).toBeVisible();
});

test("system page groups lagrange clusters and HUR L1 lists ship ores", async ({
  page,
}) => {
  await page.goto("/en/locations/stanton");

  await expect(
    page.getByRole("heading", { name: "Lagrange points" }),
  ).toBeVisible();

  await page.getByRole("link", { name: /HUR L1/ }).click();
  await expect(page).toHaveURL(/\/en\/locations\/stanton\/hur-l1$/);
  // Lagrange-Cluster tragen eigene Wiki-Vorkommen (z. B. Laranite)
  const occurrenceRows = page.locator("table tbody tr");
  await expect(occurrenceRows.first()).toBeVisible();
});

/**
 * Regressionstest für den Outpost-Roll-up: Mining-Outposts haben keine
 * eigenen Ressourcen-Daten — sie erben die Vorkommen des Mutter-Monds
 * und zeigen das als Hinweis an.
 */
test("mining outpost inherits the parent moon's occurrences", async ({
  page,
}) => {
  await page.goto("/en/locations/stanton/arccorp-mining-area-061");

  await expect(
    page.getByRole("heading", { name: "ArcCorp Mining Area 061" }),
  ).toBeVisible();
  await expect(
    page.getByText(/No local occurrences — showing occurrences of Wala/),
  ).toBeVisible();

  const occurrenceRows = page.locator("table tbody tr");
  await expect(occurrenceRows.first()).toBeVisible();
});

test("unknown system returns 404", async ({ page }) => {
  const response = await page.goto("/en/locations/atlantis");
  expect(response?.status()).toBe(404);
});
