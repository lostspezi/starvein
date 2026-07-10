/**
 * Erz-Vergleich: bis zu drei Erze nebeneinander (Signatur, Preise,
 * Top-Fundorte). Voraussetzung: docker compose up -d && pnpm seed.
 */
import { expect, test } from "@playwright/test";

test("compares two ores side by side via URL state", async ({ page }) => {
  await page.goto("/en/compare");

  await expect(
    page.getByText("Pick up to three ores to compare."),
  ).toBeVisible();

  await page.getByLabel("Ore 1").selectOption("QUAN");
  await expect(page).toHaveURL(/ores=QUAN/);
  await expect(
    page.getByRole("heading", { name: /Quantainium/ }),
  ).toBeVisible();
  await expect(page.getByText("3170")).toBeVisible();

  await page.getByLabel("Ore 2").selectOption("HADA");
  await expect(page).toHaveURL(/ores=QUAN,HADA|ores=QUAN%2CHADA/);
  await expect(page.getByRole("heading", { name: /Hadanite/ })).toBeVisible();
});

test("deep link renders the comparison directly", async ({ page }) => {
  await page.goto("/en/compare?ores=GOLD,BEXA");

  await expect(page.getByRole("heading", { name: /Gold/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Bexalite/ })).toBeVisible();
});
