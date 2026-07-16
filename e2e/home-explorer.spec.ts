/**
 * Startseiten-Dashboard + Vorkommen: das kompakte Top-Vorkommen-Widget auf
 * der Startseite (ein Vorkommen pro Erz) und die volle filterbare Tabelle
 * auf /occurrences. Voraussetzung: docker compose up -d && pnpm seed.
 * Preise dürfen fehlen (kein UEX-Sync nötig) — dann zeigt die Spalte "–".
 */
import { expect, test } from "@playwright/test";

test("home shows the compact widget with one row per ore", async ({ page }) => {
  await page.goto("/en");

  const rows = page.locator("tbody tr");
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(10);

  // Dedupe: jedes Erz nur einmal (erste Spalte verlinkt aufs Erz)
  const hrefs = await page
    .locator("tbody tr td:first-child a")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(new Set(hrefs).size).toBe(hrefs.length);

  await expect(
    page.getByRole("link", { name: /View all [\d,.]+ occurrences/ }),
  ).toHaveAttribute("href", "/en/occurrences");
});

test("occurrences page shows the full table", async ({ page }) => {
  await page.goto("/en/occurrences");

  await expect(
    page.getByRole("heading", { name: "Occurrences" }),
  ).toBeVisible();
  const rows = page.locator("tbody tr");
  expect(await rows.count()).toBeGreaterThan(50);
});

test("method filter narrows rows via URL state on /occurrences", async ({
  page,
}) => {
  await page.goto("/en/occurrences");
  const allCount = await page.locator("tbody tr").count();

  const methodGroup = page.getByRole("group", {
    name: "Filter by mining method",
  });
  await methodGroup.getByRole("button", { name: "ROC" }).click();

  await expect(page).toHaveURL(/method=roc/);
  // 15s: Der nuqs-Roundtrip (shallow:false) rendert serverseitig neu —
  // unter paralleler e2e-Last dauert das länger als die 5s-Default-Poll.
  await expect
    .poll(async () => page.locator("tbody tr").count(), { timeout: 15_000 })
    .toBeLessThan(allCount);
  expect(await page.locator("tbody tr").count()).toBeGreaterThan(0);
});

test("ore select narrows the home widget to one ore", async ({ page }) => {
  await page.goto("/en");

  // Retry gegen Hydration-Race: Select ist im SSR-HTML sichtbar, bevor
  // React die Change-Handler angehängt hat
  await expect(async () => {
    await page.getByLabel("Ore", { exact: true }).selectOption("QUAN");
    await expect(page).toHaveURL(/ore=QUAN/, { timeout: 2000 });
  }).toPass();
  await expect
    .poll(
      async () => {
        const hrefs = await page
          .locator("tbody tr td:first-child a")
          .evaluateAll((links) =>
            links.map((link) => link.getAttribute("href")),
          );
        return (
          hrefs.length > 0 &&
          hrefs.every((href) => href?.endsWith("/ores/quan"))
        );
      },
      { timeout: 15_000 },
    )
    .toBe(true);
});

test("system filter narrows the home widget to Pyro", async ({ page }) => {
  await page.goto("/en");

  const systemGroup = page.getByRole("group", {
    name: "Filter by star system",
  });
  await systemGroup.getByRole("button", { name: "PYRO" }).click();

  await expect(page).toHaveURL(/system=PYRO/);
  await expect
    .poll(
      async () => {
        const hrefs = await page
          .locator("tbody tr td:nth-child(2) a")
          .evaluateAll((links) =>
            links.map((link) => link.getAttribute("href")),
          );
        return (
          hrefs.length > 0 &&
          hrefs.every((href) => href?.includes("/locations/pyro/"))
        );
      },
      { timeout: 15_000 },
    )
    .toBe(true);
});

test("home shows the loadout and guide showcases with CTA", async ({
  page,
}) => {
  await page.goto("/en");

  await expect(
    page.getByRole("heading", { name: "Community loadouts" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Community guides" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create loadout" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse all loadouts" }),
  ).toHaveAttribute("href", "/en/loadouts");
  await expect(
    page.getByRole("link", { name: "Browse all guides" }),
  ).toHaveAttribute("href", "/en/guides");
});

test("home shows the welcome text and quick links", async ({ page }) => {
  await page.goto("/en");

  await expect(
    page.getByText("your free mining reference for Star Citizen", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Jump right in" }),
  ).toBeVisible();
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
