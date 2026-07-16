/**
 * Ships-Happy-Path: Kauf-/Miet-Übersicht der Mining-Fahrzeuge ist ohne
 * Account browsbar, Filter setzen URL-State. Läuft sync-unabhängig gegen
 * die geseedete DB (ohne UEX-Sync zeigt die Seite den neverSynced-Hinweis
 * bzw. nach Sync die Preistabellen — beides ohne Preis-Assertions).
 */
import { expect, test } from "@playwright/test";

test("ships page is browsable without an account", async ({ page }) => {
  await page.goto("/en/ships");

  await expect(
    page.getByRole("heading", { name: "Buy & Rent Ships" }),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Vehicle" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Offer" })).toBeVisible();
});

test("vehicle filter narrows the list via URL state", async ({ page }) => {
  await page.goto("/en/ships");

  await page
    .getByRole("combobox", { name: "Vehicle" })
    .selectOption({ label: "ROC" });
  await expect(page).toHaveURL(/\?vehicle=roc$/);
});

test("offer type filter sets the offer param", async ({ page }) => {
  await page.goto("/en/ships");

  await page.getByRole("group", { name: "Offer" }).getByText("Rent").click();
  await expect(page).toHaveURL(/offer=rental/);
});
