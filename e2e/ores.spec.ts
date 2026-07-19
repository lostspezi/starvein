/**
 * Slice-1-Happy-Path: Erz-Referenz.
 * Voraussetzung: docker compose up -d && pnpm seed (befüllte 'starvein'-DB).
 *
 * Erznamen-Assertions sind auf <main> gescoped: der Preisticker unter dem
 * Header zeigt dieselben Namen als Laufband auf jeder Seite — ungescopte
 * getByText-Matcher würden im Strict Mode kollidieren.
 */
import { expect, test } from "@playwright/test";

test("ore reference lists seeded ores", async ({ page }) => {
  await page.goto("/en/ores");

  await expect(
    page.getByRole("heading", { name: "Ore Reference" }),
  ).toBeVisible();
  const main = page.getByRole("main");
  await expect(main.getByText("Quantainium")).toBeVisible();
  await expect(main.getByText("Hadanite")).toBeVisible();
});

test("rarity filter narrows the list via URL state", async ({ page }) => {
  await page.goto("/en/ores");

  await page.getByRole("button", { name: "Rare", exact: true }).click();

  await expect(page).toHaveURL(/rarity=rare/);
  const main = page.getByRole("main");
  await expect(main.getByText("Gold", { exact: true })).toBeVisible();
  await expect(main.getByText("Quantainium")).not.toBeVisible();
});

test("method filter shows only FPS minables", async ({ page }) => {
  await page.goto("/en/ores?method=fps");

  const main = page.getByRole("main");
  await expect(main.getByText("Hadanite")).toBeVisible();
  await expect(main.getByText("Quantainium")).not.toBeVisible();
});

test("expanding an ore row reveals the full signature cluster and prices", async ({
  page,
}) => {
  await page.goto("/en/ores");

  const main = page.getByRole("main");
  const quanRow = main.locator("tr", { hasText: "Quantainium" }).first();
  await quanRow
    .getByRole("button", { name: "Show signature cluster and prices" })
    .click();

  // Quantainium is ship-mined: the panel identifies the mineral and shows the
  // 1×–4× cluster sums plus the raw/refined sell prices.
  await expect(
    main.getByText("Signature cluster (identifies mineral)"),
  ).toBeVisible();
  await expect(main.getByText("Sell refined").first()).toBeVisible();
});

test("GET /api/ores returns the seeded dataset", async ({ request }) => {
  const response = await request.get("/api/ores");
  expect(response.status()).toBe(200);

  const ores = await response.json();
  expect(ores.length).toBeGreaterThanOrEqual(37);
  expect(ores.some((o: { code: string }) => o.code === "QUAN")).toBe(true);
});
