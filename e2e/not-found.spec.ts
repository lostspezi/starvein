/**
 * Lokalisierte 404-Seite: unbekannte URLs antworten mit Status 404,
 * rendern die 404-Ansicht im Locale-Layout (inkl. Pflicht-Disclaimer)
 * und bieten einen Weg zurück zur Startseite.
 */
import { expect, test } from "@playwright/test";
import { FAN_DISCLAIMER_TEXT, RSI_URL } from "../src/test/factories";

test("unknown english route renders the localized 404 with status 404", async ({
  page,
}) => {
  const response = await page.goto("/en/this-page-does-not-exist");
  expect(response?.status()).toBe(404);

  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to home" }),
  ).toHaveAttribute("href", "/en");

  // Das Layout (und damit die Branding-Pflicht) muss auch auf der 404 greifen
  await expect(page.getByText(FAN_DISCLAIMER_TEXT)).toBeVisible();
  await expect(page.locator(`a[href*="${RSI_URL}"]`).first()).toBeVisible();
});

test("unknown german route renders the german 404", async ({ page }) => {
  const response = await page.goto("/de/diese-seite-gibt-es-nicht");
  expect(response?.status()).toBe(404);

  await expect(
    page.getByRole("heading", { name: "Seite nicht gefunden" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Zurück zur Startseite" }),
  ).toHaveAttribute("href", "/de");
});

test("unknown ore code still responds with 404", async ({ page }) => {
  const response = await page.goto("/en/ores/doesnotexist123");
  expect(response?.status()).toBe(404);
});
