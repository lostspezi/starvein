/**
 * PERMANENTER Responsive-Test (Mobile-first-Vorgabe).
 *
 * Prüft jede geroutete Seite bei Mobile- (375px) und Tablet-Breite (768px):
 * kein horizontales Überlaufen des Dokuments. Neue Slices werden über
 * e2e/routes.ts automatisch mitgeprüft. Nicht schwächen oder skippen.
 */
import { expect, test } from "@playwright/test";
import { ROUTES } from "./routes";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`no horizontal overflow on ${route}`, async ({ page }) => {
        await page.goto(route);

        const overflow = await page.evaluate(() => {
          const el = document.documentElement;
          return el.scrollWidth - el.clientWidth;
        });
        expect(overflow).toBeLessThanOrEqual(1);
      });
    }
  });
}

test.describe("mobile header", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("keeps nav, search and locale switcher usable", async ({ page }) => {
    await page.goto("/en");

    await expect(page.getByRole("link", { name: "Ores" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Search" })).toBeVisible();
    await expect(page.getByRole("button", { name: "English" })).toBeVisible();
  });
});
