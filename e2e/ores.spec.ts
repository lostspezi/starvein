/**
 * Slice-1-Happy-Path: Erz-Referenz.
 * Voraussetzung: docker compose up -d && pnpm seed (befüllte 'starvein'-DB).
 */
import { expect, test } from "@playwright/test";

test("ore reference lists seeded ores", async ({ page }) => {
  await page.goto("/en/ores");

  await expect(
    page.getByRole("heading", { name: "Ore Reference" }),
  ).toBeVisible();
  await expect(page.getByText("Quantainium")).toBeVisible();
  await expect(page.getByText("Hadanite")).toBeVisible();
});

test("rarity filter narrows the list via URL state", async ({ page }) => {
  await page.goto("/en/ores");

  await page.getByRole("button", { name: "Rare", exact: true }).click();

  await expect(page).toHaveURL(/rarity=rare/);
  await expect(page.getByText("Gold", { exact: true })).toBeVisible();
  await expect(page.getByText("Quantainium")).not.toBeVisible();
});

test("method filter shows only ROC minables", async ({ page }) => {
  await page.goto("/en/ores?method=roc");

  await expect(page.getByText("Hadanite")).toBeVisible();
  await expect(page.getByText("Quantainium")).not.toBeVisible();
});

test("GET /api/ores returns the seeded dataset", async ({ request }) => {
  const response = await request.get("/api/ores");
  expect(response.status()).toBe(200);

  const ores = await response.json();
  expect(ores.length).toBeGreaterThanOrEqual(37);
  expect(ores.some((o: { code: string }) => o.code === "QUAN")).toBe(true);
});
