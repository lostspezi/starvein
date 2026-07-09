/**
 * PERMANENTER Compliance-Test (RSI-Fansite-Policy, CLAUDE.md §2).
 *
 * Dieser Test darf NIEMALS gelöscht, geskippt oder abgeschwächt werden —
 * auch nicht "temporär". Er sichert ab, dass auf jeder gerouteten Seite
 * der wortwörtliche Pflicht-Disclaimer sichtbar ist und ein Link zur
 * offiziellen Star-Citizen-Seite existiert.
 */
import { expect, test } from "@playwright/test";
import { FAN_DISCLAIMER_TEXT, RSI_URL } from "../src/test/factories";
import { ROUTES } from "./routes";

for (const route of ROUTES) {
  test.describe(`branding compliance on ${route}`, () => {
    test("shows the verbatim fansite disclaimer", async ({ page }) => {
      await page.goto(route);
      await expect(
        page.getByText(FAN_DISCLAIMER_TEXT, { exact: true }),
      ).toBeVisible();
    });

    test("links to the official RSI website", async ({ page }) => {
      await page.goto(route);
      const rsiLink = page.locator(`a[href^="${RSI_URL}"]`);
      await expect(rsiLink.first()).toBeVisible();
    });
  });
}
