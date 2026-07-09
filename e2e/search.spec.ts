/**
 * Slice-2c-Happy-Path: Suche mit Autocomplete.
 * Voraussetzung: docker compose up -d && pnpm seed (befüllte 'starvein'-DB).
 */
import { expect, test } from "@playwright/test";

test("finds a moon via the header search and navigates to it", async ({
  page,
}) => {
  await page.goto("/en");

  const input = page.getByRole("combobox", { name: "Search" });
  await input.fill("yela");

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

  await page.getByRole("combobox", { name: "Search" }).fill("quanta");
  await page
    .getByRole("listbox")
    .getByRole("option", { name: /Quantainium/ })
    .click();

  await expect(page).toHaveURL(/\/en\/ores\/quan$/);
  await expect(
    page.getByRole("heading", { name: /Quantainium/ }),
  ).toBeVisible();
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
