/**
 * Happy-Path: Blueprint-Katalog (aus dem Star-Citizen-Wiki gesynct),
 * Material-Reverse-Lookup und Erz→Blueprint-Panel.
 * Voraussetzung: docker compose up -d && pnpm seed && pnpm sync:wiki
 */
import { expect, test } from "@playwright/test";
import { clickForUrl } from "./url-state";

test("blueprint list shows a paginated page of synced blueprints", async ({
  page,
}) => {
  await page.goto("/en/blueprints");

  await expect(page.getByRole("heading", { name: "Blueprints" })).toBeVisible();

  // Das Wiki liefert über 1500 Blueprints — die Liste ist seitenweise.
  const rows = page.getByRole("table").locator("tbody tr");
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeLessThanOrEqual(50);
  await expect(
    page.getByText(/Page 1 of \d+ · \d+ blueprints/).first(),
  ).toBeVisible();
});

test("pagination moves to the next page via URL state", async ({ page }) => {
  await page.goto("/en/blueprints");

  const firstRowBefore = await page
    .getByRole("table")
    .locator("tbody tr")
    .first()
    .textContent();

  await clickForUrl(
    page,
    page.getByRole("button", { name: "Next" }).first(),
    /page=2/,
  );

  await expect(page.getByText(/Page 2 of \d+/).first()).toBeVisible();
  const firstRowAfter = await page
    .getByRole("table")
    .locator("tbody tr")
    .first()
    .textContent();
  expect(firstRowAfter).not.toBe(firstRowBefore);
});

test("category filter narrows the list via URL state", async ({ page }) => {
  await page.goto("/en/blueprints");

  await clickForUrl(
    page,
    page.getByRole("button", { name: "Armor", exact: true }),
    /category=armor/,
  );

  // Omnisky ist eine Schiffswaffe -> darf im Armor-Filter nicht erscheinen
  await expect(
    page.getByRole("link", { name: "Omnisky III Cannon", exact: true }),
  ).toHaveCount(0);
});

/** Liest die Gesamtzahl aus der Pagination-Statuszeile ("… · N blueprints"). */
async function totalFromPagination(page: import("@playwright/test").Page) {
  const status = await page
    .getByRole("navigation", { name: "Blueprint pages" })
    .first()
    .textContent();
  return Number(status?.match(/(\d+) blueprints/)?.[1]);
}

test("material filter narrows to blueprints using that material", async ({
  page,
}) => {
  await page.goto("/en/blueprints");
  const total = await totalFromPagination(page);

  await page.goto("/en/blueprints?material=AGRI");
  const filtered = await totalFromPagination(page);

  // Agricium speist nur einen Teil des Katalogs.
  expect(total).toBeGreaterThan(0);
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(total);
});

test("search finds a blueprint by its produced item", async ({ page }) => {
  await page.goto("/en/blueprints?q=omnisky%20iii");

  await expect(
    page.getByRole("link", { name: "Omnisky III Cannon", exact: true }),
  ).toBeVisible();
});

test("material filter and search combine", async ({ page }) => {
  await page.goto("/en/blueprints?material=AGRI&q=omnisky%20iii");

  await expect(
    page.getByRole("link", { name: "Omnisky III Cannon", exact: true }),
  ).toBeVisible();
});

test("collected-only filter is hidden for anonymous users", async ({
  page,
}) => {
  await page.goto("/en/blueprints");

  await expect(
    page.getByRole("button", { name: "Collected only" }),
  ).toHaveCount(0);
});

test("blueprint detail lists ingredients with SCU and item units", async ({
  page,
}) => {
  await page.goto("/en/blueprints/bp_craft_amrs_lasercannon_s1");

  await expect(
    page.getByRole("heading", { name: /Omnisky III Cannon/ }),
  ).toBeVisible();

  // Agricium wird in SCU geführt, Hadanite/Dolivine als Stückzahl.
  await expect(
    page.getByRole("link", { name: "Agricium", exact: true }),
  ).toHaveAttribute("href", "/en/materials/agri");
  await expect(page.getByText("0.36 SCU")).toBeVisible();
  // Hadanite und Dolivine brauchen beide 7 Stück -> zeilenweise prüfen.
  const hadaniteRow = page
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: "Hadanite", exact: true }) });
  await expect(hadaniteRow).toContainText("7×");
});

test("ore detail page shows blueprints that use the ore", async ({ page }) => {
  await page.goto("/en/ores/agri");

  await expect(
    page.getByRole("heading", { name: "Blueprints using this ore" }),
  ).toBeVisible();
  await expect(page.getByText("via Agricium").first()).toBeVisible();
});

test("ore with many blueprints links to the filtered list", async ({
  page,
}) => {
  // Aslarite speist über 800 Blueprints — die Erz-Seite zeigt nur einen
  // Ausschnitt und muss auf die gefilterte Liste verlinken.
  await page.goto("/en/ores/asla");

  const showAll = page.getByRole("link", { name: /Show all \d+ blueprints/ });
  await expect(showAll).toBeVisible();

  await clickForUrl(page, showAll, /\/blueprints\?material=ASLA/);
});

test("ore without a linked material shows the empty state", async ({
  page,
}) => {
  // ICEW (Ice) ist ein Erz, aber keine Blueprint-Zutat.
  await page.goto("/en/ores/icew");

  await expect(page.getByText("No blueprint uses this ore.")).toBeVisible();
});
