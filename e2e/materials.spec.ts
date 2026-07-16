/**
 * Happy-Path: Material-Katalog und Material-Detail inkl.
 * Blueprint-Reverse-Lookup.
 * Voraussetzung: docker compose up -d && pnpm seed && pnpm sync:wiki
 * (Blueprints/Materialien kommen aus dem Wiki-Sync, nicht aus dem Seed).
 */
import { expect, test } from "@playwright/test";
import { clickForUrl } from "./url-state";

test("material catalog lists synced materials", async ({ page }) => {
  await page.goto("/en/materials");

  await expect(
    page.getByRole("heading", { name: "Material Catalog" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Agricium", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Pressurized Ice", exact: true }),
  ).toBeVisible();
});

test("kind filter narrows the list via URL state", async ({ page }) => {
  await page.goto("/en/materials");

  await clickForUrl(
    page,
    page.getByRole("button", { name: "Item (count)", exact: true }),
    /kind=item/,
  );
  // Hadanite ist ein ROC/FPS-Gem -> kind=item
  await expect(
    page.getByRole("link", { name: "Hadanite", exact: true }),
  ).toBeVisible();
  // Agricium wird in SCU geführt -> kind=resource, muss verschwinden
  await expect(
    page.getByRole("link", { name: "Agricium", exact: true }),
  ).toHaveCount(0);
});

test("ores-only filter hides non-ore materials", async ({ page }) => {
  await page.goto("/en/materials?ores=1");

  await expect(
    page.getByRole("link", { name: "Agricium", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Pressurized Ice", exact: true }),
  ).toHaveCount(0);
});

test("search filters materials by name", async ({ page }) => {
  await page.goto("/en/materials");

  // fill() vor abgeschlossener Hydration verpufft — bis zur URL wiederholen.
  const input = page.getByRole("searchbox", { name: "Search materials" });
  await expect(async () => {
    await input.fill("");
    await input.fill("agricium");
    await expect(page).toHaveURL(/q=agricium/, { timeout: 2_000 });
  }).toPass();

  await expect(
    page.getByRole("link", { name: "Agricium", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Hadanite", exact: true }),
  ).toHaveCount(0);
});

test("material detail links back to its ore", async ({ page }) => {
  await page.goto("/en/materials/agri");

  await expect(page.getByRole("heading", { name: /AGRI/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "AGRI", exact: true }),
  ).toHaveAttribute("href", "/en/ores/agri");
});

test("material detail shows what it can craft (reverse lookup)", async ({
  page,
}) => {
  await page.goto("/en/materials/agri");

  await expect(
    page.getByRole("heading", { name: "Craftable with this material" }),
  ).toBeVisible();

  // Agricium speist ~200 Blueprints — die Detailseite zeigt nur einen
  // Ausschnitt, daher auf die erste Zeile und den "alle anzeigen"-Link prüfen.
  const firstBlueprint = page
    .getByRole("table")
    .locator("tbody tr")
    .first()
    .getByRole("link")
    .first();
  await expect(firstBlueprint).toBeVisible();

  await expect(
    page.getByRole("link", { name: /Show all \d+ blueprints/ }),
  ).toHaveAttribute("href", "/en/blueprints?material=AGRI");
});

test("material detail counts how many blueprints use it", async ({ page }) => {
  await page.goto("/en/materials/agri");

  await expect(page.getByText(/\d+ blueprints/).first()).toBeVisible();
});
