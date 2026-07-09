/**
 * Slice-5-Happy-Path: UEX-Sync (Preise & Refinery).
 * Das Preis-Panel rendert unabhängig vom Sync-Zustand (Daten oder
 * "noch nicht synchronisiert"); der Sync selbst ist per Secret geschützt.
 */
import { expect, test } from "@playwright/test";

test("ore detail shows the prices & refinery panel", async ({ page }) => {
  await page.goto("/en/ores/gold");

  await expect(
    page.getByRole("heading", { name: "Prices & refinery" }),
  ).toBeVisible();
});

test("sync endpoint rejects requests without the secret", async ({
  request,
}) => {
  const response = await request.post("/api/sync-uex");
  expect(response.status()).toBe(401);
});
