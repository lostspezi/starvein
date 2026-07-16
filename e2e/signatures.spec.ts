/**
 * Slice-4-Happy-Path: Signatur-Referenz.
 * Voraussetzung: docker compose up -d && pnpm seed (befüllte 'starvein'-DB).
 */
import { expect, test } from "@playwright/test";

test("signature reference shows ship table and ground explainer", async ({
  page,
}) => {
  await page.goto("/en/signatures");

  await expect(
    page.getByRole("heading", { name: "Signature Reference" }),
  ).toBeVisible();

  // Ship: Quantainium mit Mineral-Signatur 3170
  const quanRow = page.locator("tr", { hasText: "Quantainium" });
  await expect(quanRow.getByText("3170")).toBeVisible();

  // Ground: größenbasierte Signaturen 3000/4000 + Mineral-Liste.
  // .first(): Wiki-Signaturen der Ship-Tabelle können dieselben Werte tragen.
  await expect(page.getByText("3000", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("4000", { exact: true }).first()).toBeVisible();
  // Auf <main> gescoped: der Preisticker verlinkt Erznamen auf jeder Seite
  await expect(
    page.getByRole("main").getByRole("link", { name: "Hadanite" }),
  ).toBeVisible();
});

test("ship ore detail shows its per-mineral signature", async ({ page }) => {
  await page.goto("/en/ores/quan");

  await expect(page.getByText("3170")).toBeVisible();
  await expect(page.getByText("40–80%")).toBeVisible();
});

test("ground mineral detail explains size-only signatures", async ({
  page,
}) => {
  await page.goto("/en/ores/hada");

  await expect(page.getByText("3000", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("4000", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText(/does not identify the mineral/, { exact: false }),
  ).toBeVisible();
});
