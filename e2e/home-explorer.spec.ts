/**
 * Startseiten-Explorer: filterbare Vorkommen-Übersicht mit Preisen.
 * Voraussetzung: docker compose up -d && pnpm seed. Preise dürfen fehlen
 * (kein UEX-Sync in der E2E-Umgebung nötig) — dann zeigt die Spalte "–".
 */
import { expect, test } from "@playwright/test";

test("home shows the explorer with all occurrences", async ({ page }) => {
  await page.goto("/en");

  const rows = page.locator("tbody tr");
  expect(await rows.count()).toBeGreaterThan(50);
});

test("method filter narrows rows via URL state", async ({ page }) => {
  await page.goto("/en");
  const allCount = await page.locator("tbody tr").count();

  const methodGroup = page.getByRole("group", {
    name: "Filter by mining method",
  });
  await methodGroup.getByRole("button", { name: "ROC" }).click();

  await expect(page).toHaveURL(/method=roc/);
  await expect
    .poll(async () => page.locator("tbody tr").count())
    .toBeLessThan(allCount);
  expect(await page.locator("tbody tr").count()).toBeGreaterThan(0);
});

test("ore select narrows to one ore", async ({ page }) => {
  await page.goto("/en");

  // Retry gegen Hydration-Race: Select ist im SSR-HTML sichtbar, bevor
  // React die Change-Handler angehängt hat
  await expect(async () => {
    await page.getByLabel("Ore", { exact: true }).selectOption("QUAN");
    await expect(page).toHaveURL(/ore=QUAN/, { timeout: 2000 });
  }).toPass();
  await expect
    .poll(async () => {
      const hrefs = await page
        .locator("tbody tr td:first-child a")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
      return (
        hrefs.length > 0 && hrefs.every((href) => href?.endsWith("/ores/quan"))
      );
    })
    .toBe(true);
});

test("system filter narrows to Pyro", async ({ page }) => {
  await page.goto("/en");

  const systemGroup = page.getByRole("group", {
    name: "Filter by star system",
  });
  await systemGroup.getByRole("button", { name: "PYRO" }).click();

  await expect(page).toHaveURL(/system=PYRO/);
  await expect
    .poll(async () => {
      const hrefs = await page
        .locator("tbody tr td:nth-child(2) a")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
      return (
        hrefs.length > 0 &&
        hrefs.every((href) => href?.includes("/locations/pyro/"))
      );
    })
    .toBe(true);
});

test("home shows the loadout bento with stats and CTA", async ({ page }) => {
  await page.goto("/en");

  await expect(
    page.getByRole("heading", { name: "Community loadouts" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create loadout" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse all loadouts" }),
  ).toHaveAttribute("href", "/en/loadouts");
});

test("the database tile counts the synced blueprints", async ({ page }) => {
  await page.goto("/en");

  const stats = page
    .getByRole("heading", { name: "The database" })
    .locator("..");

  await expect(stats.getByText("Blueprints")).toBeVisible();
  // Der Wiki-Sync liefert über 1500 Blueprints — 0 hieße: Sync nicht gelaufen.
  await expect(stats.getByText(/^[1-9][\d,.]*$/).first()).toBeVisible();
});

test("anonymous users see no favorite stars in the table", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await expect(
    page.locator("tbody").getByRole("button", { name: /favorite/i }),
  ).toHaveCount(0);
});
