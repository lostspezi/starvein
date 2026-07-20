/**
 * Slice-4-Happy-Path: Signatur-Referenz.
 * Voraussetzung: docker compose up -d && pnpm seed (befüllte 'starvein'-DB).
 */
import { expect, test } from "@playwright/test";

test("signature cluster chart maps a scanned value to its cluster step", async ({
  page,
}) => {
  await page.goto("/en/signatures");

  await expect(
    page.getByRole("heading", { name: "Scan signature identifier" }),
  ).toBeVisible();
  // Generic ground tracks (size only, not per mineral)
  await expect(page.getByText("ROC Mineables")).toBeVisible();
  await expect(page.getByText("FPS Mineables")).toBeVisible();

  // Quantainium base 3170 → ×2 cluster = 6340; the row lights up as a match.
  await page.getByLabel("Scan value").fill("6340");
  await expect(page.getByText("×2").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Show details for Quantainium" }),
  ).toHaveAttribute("data-matched", "true");
});

test("signature chart row expands to cluster and composition detail", async ({
  page,
}) => {
  await page.goto("/en/signatures");

  await page
    .getByRole("button", { name: "Show details for Quantainium" })
    .click();

  await expect(
    page.getByText("Signature cluster (identifies mineral)").first(),
  ).toBeVisible();
  await expect(page.getByText("40–80%").first()).toBeVisible();
});

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

  // Der Signaturwert steht jetzt sowohl im Signatur-Panel als auch in der
  // Signatur-Spalte der Fundort-Tabelle — .first() trifft das Panel oben.
  await expect(page.getByText("3170").first()).toBeVisible();
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
