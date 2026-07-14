/**
 * Slice-D8-Happy-Path: die Companion-Landing-Page mit Anleitung und
 * Beta-Download. (Branding-Compliance läuft separat über routes.ts.)
 */
import { expect, test } from "@playwright/test";

test("companion page shows the guide and beta download", async ({ page }) => {
  await page.goto("/en/companion");

  await expect(
    page.getByRole("heading", { name: "STARVEIN Companion" }),
  ).toBeVisible();
  await expect(page.getByText("Beta 0.1.0")).toBeVisible();

  const download = page.getByRole("link", { name: "Download for Windows" });
  await expect(download).toBeVisible();
  await expect(download).toHaveAttribute(
    "href",
    "https://github.com/lostspezi/starvein/releases",
  );

  // Alle vier Schritte der Anleitung
  await expect(page.getByText("Connect with Discord")).toBeVisible();
  await expect(
    page.getByText("Press the hotkey at the terminal"),
  ).toBeVisible();
  await expect(page.getByText("Review and confirm")).toBeVisible();
  await expect(page.getByText("Track jobs and get notified")).toBeVisible();
});

test("companion page renders in German with nav entry", async ({ page }) => {
  await page.goto("/de/companion");

  await expect(page.getByText("Mit Discord verbinden")).toBeVisible();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Companion" }),
  ).toBeVisible();
});
