/**
 * Rock-Rechner: Masse + Resistenz → welcher Laser knackt den Stein mit
 * wie vielen Köpfen. Voraussetzung: docker compose up -d && pnpm seed.
 */
import { expect, test } from "@playwright/test";

test("computes heads needed per laser from mass and resistance", async ({
  page,
}) => {
  await page.goto("/en/calculator");

  await expect(page.getByText("Enter mass and resistance")).toBeVisible();

  await page.getByLabel("Mass").fill("30000");
  await page.getByLabel("Resistance (%)").fill("30");
  await expect(page).toHaveURL(/mass=30000/);
  await expect(page).toHaveURL(/res=30/);

  // Helix II (4080, res 0.7): required(2) = 3822 ≤ 8160 → 2 Köpfe
  const helixRow = page.getByRole("row", { name: /Helix II/ });
  await expect(helixRow.getByText("2×")).toBeVisible();

  // Craft-Bonus +40 %: 4080 × 1.4 = 5712 ≥ 5460 → ein Kopf reicht
  await page.getByLabel("Crafted laser power bonus (%)").fill("40");
  await expect(page).toHaveURL(/bonus=40/);
  await expect(helixRow.getByText("1×")).toBeVisible();
  await page.getByLabel("Crafted laser power bonus (%)").fill("");
  await expect(helixRow.getByText("2×")).toBeVisible();

  // 2× Surge (additiv ×2.0 Power, res-Stack 0.7) → ein Kopf reicht
  await page.getByLabel("Module slot 1").selectOption("surge");
  await page.getByLabel("Module slot 2").selectOption("surge");
  await expect(page).toHaveURL(/modules=surge/);
  await expect(helixRow.getByText("1×")).toBeVisible();
});

test("deep link renders the verdict directly", async ({ page }) => {
  await page.goto("/en/calculator?mass=30000&res=30");

  await expect(
    page.getByRole("row", { name: /Helix II/ }).getByText("2×"),
  ).toBeVisible();
  await expect(
    page.getByText("Sign in to check your saved loadouts against this rock."),
  ).toBeVisible();
});
