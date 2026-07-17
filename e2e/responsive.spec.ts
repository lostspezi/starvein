/**
 * PERMANENTER Responsive-Test (Mobile-first-Vorgabe).
 *
 * Prüft jede geroutete Seite bei Mobile- (375px), Tablet- (768px),
 * Desktop- (1280px) und WQHD-Breite (2560px): kein horizontales Überlaufen
 * des Dokuments. Neue Slices werden über e2e/routes.ts automatisch
 * mitgeprüft. Nicht schwächen oder skippen.
 */
import { expect, test } from "@playwright/test";
import { ROUTES } from "./routes";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "wqhd", width: 2560, height: 1200 },
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

    // Auf den Header scopen: die Startseite hat eigene "Ores"-Links
    // (Quick-Link-Chips), hier geht es nur um die Burger-Navigation.
    const header = page.getByRole("banner");

    // Nav ist mobil hinter dem Burger-Toggle eingeklappt
    await expect(header.getByRole("link", { name: "Ores" })).toBeHidden();
    await header.getByRole("button", { name: "Navigation" }).click();
    await expect(header.getByRole("link", { name: "Ores" })).toBeVisible();
    await expect(
      header.getByRole("combobox", { name: "Search" }),
    ).toBeVisible();
    await expect(header.getByRole("button", { name: "English" })).toBeVisible();
  });
});

test.describe("desktop header", () => {
  // Ab xl (1280px) muss der Header bis WQHD einzeilig bleiben: eine
  // umgebrochene zweite Zeile hebt die Banner-Höhe auf ~90px+, einzeilig
  // sind es ~60px. Deutsche Labels + ausgeloggter Discord-Button sind der
  // breiteste Fall.
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "wqhd", width: 2560, height: 1200 },
  ] as const) {
    test.describe(`${viewport.name} (${viewport.width}px)`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
      });

      test("keeps the nav in a single row", async ({ page }) => {
        await page.goto("/de");

        // Erst nach der Hydration messen: der User-Cluster (Discord-Button)
        // rendert client-seitig und ist Teil des Breiten-Budgets.
        await expect(
          page.getByRole("button", { name: "Mit Discord anmelden" }),
        ).toBeVisible();

        const box = await page.getByRole("banner").boundingBox();
        expect(box).not.toBeNull();
        expect(box?.height).toBeLessThan(80);
      });
    });
  }
});

test.describe("sticky header", () => {
  test("stays pinned and navigable after scrolling", async ({ page }) => {
    await page.goto("/en/ores");

    const position = await page
      .getByRole("banner")
      .evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe("sticky");

    await page.mouse.wheel(0, 1200);
    await expect(page.getByRole("link", { name: "Locations" })).toBeVisible();
    await page.getByRole("link", { name: "Locations" }).click();
    await expect(page).toHaveURL(/\/en\/locations$/);
  });
});
