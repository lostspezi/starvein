/**
 * Happy-Path der gruppierten Desktop-Navigation: Disclosure-Dropdowns
 * öffnen per Klick, navigieren, markieren die aktive Route und schließen
 * per Escape. Läuft im Default-Viewport (1280px = xl, einzeiliger Header).
 */
import { expect, test } from "@playwright/test";

test.describe("grouped navigation", () => {
  test("opens the mining dropdown, navigates and marks the active child", async ({
    page,
  }) => {
    await page.goto("/en");
    const header = page.getByRole("banner");

    await expect(header.getByRole("link", { name: "Ores" })).toBeHidden();

    // toPass: der erste Klick kann vor der Hydration landen und verpuffen.
    await expect(async () => {
      await header.getByRole("button", { name: "Mining" }).click();
      await expect(
        header.getByRole("link", { name: "Signatures" }),
      ).toBeVisible({ timeout: 1000 });
    }).toPass();

    await header.getByRole("link", { name: "Signatures" }).click();
    await expect(page).toHaveURL(/\/en\/signatures$/);

    await header.getByRole("button", { name: "Mining" }).click();
    await expect(
      header.getByRole("link", { name: "Signatures" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("closes the dropdown on Escape and restores trigger focus", async ({
    page,
  }) => {
    await page.goto("/en");
    const header = page.getByRole("banner");

    await expect(async () => {
      await header.getByRole("button", { name: "Mining" }).click();
      await expect(header.getByRole("link", { name: "Ores" })).toBeVisible({
        timeout: 1000,
      });
    }).toPass();

    await page.keyboard.press("Escape");

    await expect(header.getByRole("link", { name: "Ores" })).toBeHidden();
    await expect(header.getByRole("button", { name: "Mining" })).toBeFocused();
  });

  test("navigates German fleet routes", async ({ page }) => {
    await page.goto("/de");
    const header = page.getByRole("banner");

    await expect(async () => {
      await header.getByRole("button", { name: "Flotte" }).click();
      await expect(header.getByRole("link", { name: "Schiffe" })).toBeVisible({
        timeout: 1000,
      });
    }).toPass();

    await header.getByRole("link", { name: "Schiffe" }).click();
    await expect(page).toHaveURL(/\/de\/ships$/);
  });
});
