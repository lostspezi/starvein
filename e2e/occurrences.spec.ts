/**
 * Slice-3-Happy-Path: Vorkommen & Wahrscheinlichkeit.
 * Voraussetzung: docker compose up -d && pnpm seed (befüllte 'starvein'-DB).
 */
import { expect, test } from "@playwright/test";

test("ore detail lists locations sorted by probability", async ({ page }) => {
  await page.goto("/en/ores/hada");

  await expect(page.getByRole("heading", { name: /Hadanite/ })).toBeVisible();

  const rows = page.locator("tbody tr");
  await expect(rows.first()).toBeVisible();

  // Aberdeen (30%) muss vor Daymar-FPS (20%) stehen
  const texts = await rows.allTextContents();
  const aberdeenIndex = texts.findIndex((tx) => tx.includes("Aberdeen"));
  const daymar20Index = texts.findIndex(
    (tx) => tx.includes("Daymar") && tx.includes("20%"),
  );
  expect(aberdeenIndex).toBeGreaterThanOrEqual(0);
  expect(daymar20Index).toBeGreaterThan(aberdeenIndex);
});

test("method filter on ore detail narrows to ROC", async ({ page }) => {
  await page.goto("/en/ores/hada?method=roc");

  const rows = page.locator("tbody tr");
  await expect(rows.first()).toBeVisible();
  const texts = await rows.allTextContents();
  expect(texts.every((tx) => tx.includes("ROC"))).toBe(true);
});

test("location page lists its occurrences with ore links", async ({ page }) => {
  await page.goto("/en/locations/stanton/daymar");

  await expect(
    page.getByRole("heading", { name: "Occurrences" }),
  ).toBeVisible();

  const hadaniteLink = page.getByRole("link", { name: /Hadanite/ }).first();
  await expect(hadaniteLink).toBeVisible();
  await hadaniteLink.click();

  await expect(page).toHaveURL(/\/en\/ores\/hada/);
});

test("unknown ore returns 404", async ({ page }) => {
  const response = await page.goto("/en/ores/unobtanium");
  expect(response?.status()).toBe(404);
});
