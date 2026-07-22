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

test.describe("occurrences table width", () => {
  // Regression (User-Report 2026-07-22): Name, Code und Deposit-Badge in der
  // Erz-Zelle waren ohne Whitespace dazwischen EIN unbrechbarer Inline-Run —
  // die Tabelle scrollte horizontal im eigenen overflow-x-Wrapper (DE mit
  // dem breiten "Wahrscheinlichkeit"-Header am knappsten).
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const locale of ["de", "en"] as const) {
    test(`table needs no inner horizontal scroll on /${locale}/occurrences`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/occurrences`);
      await expect(page.locator("main tbody tr").first()).toBeVisible();

      const overflow = await page.evaluate(() => {
        const table = document.querySelector("main table");
        const wrap = table?.parentElement;
        return wrap ? wrap.scrollWidth - wrap.clientWidth : -1;
      });
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});

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
    // Auf den Header scopen — der Footer verlinkt die Sektion inzwischen auch
    const headerLink = page
      .getByRole("banner")
      .getByRole("link", { name: "Locations" });
    await expect(headerLink).toBeVisible();
    await headerLink.click();
    await expect(page).toHaveURL(/\/en\/locations$/);
  });
});
