/**
 * Slice-3-Happy-Path: Vorkommen & Wahrscheinlichkeit.
 * Voraussetzung: docker compose up -d && pnpm seed && pnpm sync:wiki
 * (Vorkommen kommen aus dem Wiki-Sync; keine Literal-Werte prüfen,
 * die sich mit jedem Game-Patch ändern können).
 */
import { expect, test } from "@playwright/test";

test("ore detail lists locations sorted by probability", async ({ page }) => {
  await page.goto("/en/ores/hada");

  await expect(page.getByRole("heading", { name: /Hadanite/ })).toBeVisible();

  // Die Erz-Seite zeigt mehrere Tabellen (Vorkommen, Blueprints) — gezielt
  // die Vorkommen-Tabelle adressieren.
  const rows = page
    .getByRole("table", { name: "Where to find" })
    .locator("tbody tr");
  await expect(rows.first()).toBeVisible();

  // Strukturell: Wahrscheinlichkeiten absteigend sortiert
  const texts = await rows.allTextContents();
  const percents = texts
    .map((tx) => tx.match(/(\d+(?:\.\d+)?)\s*%/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => Number(match[1]));
  expect(percents.length).toBeGreaterThan(0);
  const sorted = [...percents].sort((a, b) => b - a);
  expect(percents).toEqual(sorted);
});

test("method filter on ore detail narrows to FPS", async ({ page }) => {
  await page.goto("/en/ores/hada?method=fps");

  const rows = page
    .getByRole("table", { name: "Where to find" })
    .locator("tbody tr");
  await expect(rows.first()).toBeVisible();
  const texts = await rows.allTextContents();
  expect(texts.every((tx) => tx.includes("FPS"))).toBe(true);
});

test("location page lists its occurrences with ore links", async ({ page }) => {
  await page.goto("/en/locations/stanton/daymar");

  await expect(
    page.getByRole("heading", { name: "Occurrences" }),
  ).toBeVisible();

  // Auf <main> gescoped: der Preisticker verlinkt Erznamen auf jeder Seite
  const hadaniteLink = page
    .getByRole("main")
    .getByRole("link", { name: /Hadanite/ })
    .first();
  await expect(hadaniteLink).toBeVisible();
  await hadaniteLink.click();

  await expect(page).toHaveURL(/\/en\/ores\/hada/);
});

test("unknown ore returns 404", async ({ page }) => {
  const response = await page.goto("/en/ores/unobtanium");
  expect(response?.status()).toBe(404);
});

/**
 * Haupt-/Nebenvorkommen: Borase ist der Referenzfall aus dem
 * Community-Feedback (Hauptvorkommen an HUR L1/L4, Nebenprodukt von
 * Bexalite an CRU L1). Strukturelle Assertions, keine Literal-Locations.
 */
test("deposit filter narrows to primary deposits with rock breakdown", async ({
  page,
}) => {
  await page.goto("/en/ores/bora");
  const table = page.getByRole("table", { name: "Where to find" });
  const rows = table.locator("tbody tr");
  await expect(rows.first()).toBeVisible();
  const unfilteredCount = await rows.count();

  await page.goto("/en/ores/bora?deposit=primary");
  await expect(rows.first()).toBeVisible();
  const texts = await rows.allTextContents();
  expect(texts.some((tx) => tx.includes("Byproduct"))).toBe(false);
  expect(await rows.count()).toBeLessThanOrEqual(unfilteredCount);

  // Erste Zeile aufklappen -> Gesteins-Zusammensetzung im Detail-Panel
  await table
    .getByRole("button", { name: "Show signature cluster and prices" })
    .first()
    .click();
  await expect(page.getByText("Rock composition")).toBeVisible();
});
