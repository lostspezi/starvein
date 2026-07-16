/**
 * Slice-2c-Happy-Path: Suche mit Autocomplete.
 * Voraussetzung: docker compose up -d && pnpm seed && pnpm sync:wiki
 * (Blueprints kommen aus dem Wiki-Sync, nicht aus dem Seed).
 */
import { expect, test, type Page } from "@playwright/test";

/**
 * Tippt die Suchanfrage und wartet auf die Vorschlagsliste. fill() vor
 * abgeschlossener React-Hydration verpufft (onChange hängt noch nicht am
 * Input) — auf langsamen CI-Runnern passiert genau das. Deshalb wird die
 * Eingabe per toPass() wiederholt, bis die Liste tatsächlich aufgeht;
 * die eigentlichen Assertions der Tests bleiben unverändert.
 */
async function searchFor(page: Page, query: string) {
  const input = page.getByRole("combobox", { name: "Search" });
  await expect(async () => {
    await input.fill("");
    await input.fill(query);
    await expect(page.getByRole("listbox")).toBeVisible({ timeout: 2_000 });
  }).toPass();
}

test("finds a moon via the header search and navigates to it", async ({
  page,
}) => {
  await page.goto("/en");

  await searchFor(page, "yela");

  const option = page
    .getByRole("listbox")
    .getByRole("option", { name: "Yela Moon", exact: true });
  await expect(option).toBeVisible();
  await option.click();

  await expect(page).toHaveURL(/\/en\/locations\/stanton\/yela$/);
  await expect(page.getByRole("heading", { name: "Yela" })).toBeVisible();
});

test("finds an ore and navigates to its detail page", async ({ page }) => {
  await page.goto("/en");

  await searchFor(page, "quanta");
  await page
    .getByRole("listbox")
    .getByRole("option", { name: /Quantainium/ })
    .click();

  await expect(page).toHaveURL(/\/en\/ores\/quan$/);
  await expect(
    page.getByRole("heading", { name: /Quantainium/ }),
  ).toBeVisible();
});

test("finds a blueprint and navigates to its detail page", async ({ page }) => {
  await page.goto("/en");

  await searchFor(page, "omnisky iii");
  await page
    .getByRole("listbox")
    .getByRole("option", { name: /Omnisky III Cannon/ })
    .click();

  await expect(page).toHaveURL(
    /\/en\/blueprints\/bp_craft_amrs_lasercannon_s1$/,
  );
  await expect(
    page.getByRole("heading", { name: /Omnisky III Cannon/ }),
  ).toBeVisible();
});

test("the hero search on the home page finds blueprints too", async ({
  page,
}) => {
  await page.goto("/en");

  const hero = page.getByRole("combobox", {
    name: "Find ores, locations, blueprints and signatures",
  });
  await expect(async () => {
    await hero.fill("");
    await hero.fill("omnisky iii");
    await expect(page.getByRole("listbox")).toBeVisible({ timeout: 2_000 });
  }).toPass();

  await expect(
    page.getByRole("option", { name: /Omnisky III Cannon/ }).first(),
  ).toBeVisible();
});

/**
 * Numerische Query = gescannter RS-Wert: 18.000 = 5 × Bexalite (3.600).
 * Regressionstest für die Signatur-Suche (Basis × Cluster-Anzahl).
 */
test("resolves a scanned signature value and navigates to the ore", async ({
  page,
}) => {
  await page.goto("/en");

  await searchFor(page, "18000");

  const option = page
    .getByRole("listbox")
    .getByRole("option", { name: /5 × Bexalite/ });
  await expect(option).toBeVisible();
  await expect(option).toContainText("signature 3600");
  await option.click();

  await expect(page).toHaveURL(/\/en\/ores\/bexa$/);
});

test("GET /api/search returns grouped results", async ({ request }) => {
  const response = await request.get("/api/search?q=stanton");
  expect(response.status()).toBe(200);

  const results = await response.json();
  expect(
    results.some(
      (r: { kind: string; label: string }) =>
        r.kind === "system" && r.label === "Stanton",
    ),
  ).toBe(true);
});

test("GET /api/search includes blueprints", async ({ request }) => {
  const response = await request.get("/api/search?q=omnisky");
  expect(response.status()).toBe(200);

  const results = await response.json();
  expect(
    results.some(
      (r: { kind: string; href: string }) =>
        r.kind === "blueprint" && r.href.startsWith("/blueprints/"),
    ),
  ).toBe(true);
});

/** Die >1500 Blueprints dürfen die Kern-Entitäten nicht verdrängen. */
test("an ore still outranks blueprints for its own name", async ({
  request,
}) => {
  const response = await request.get("/api/search?q=gold");
  const results = await response.json();

  expect(results[0]).toMatchObject({ kind: "ore", label: "Gold" });
});
