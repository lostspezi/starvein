/**
 * Slice-Happy-Path: "Anreise"-Hinweis auf Asteroiden-Feld-Seiten.
 * Voraussetzung: docker compose up -d && pnpm seed && pnpm sync:wiki
 * (befüllte 'starvein'-DB; die NYX-Felder + kuratierte location-guides).
 */
import { expect, test } from "@playwright/test";

test("shows how-to-get-there guidance on a NYX asteroid field", async ({
  page,
}) => {
  await page.goto("/en/locations/nyx/glaciem-ring");

  await expect(
    page.getByRole("heading", { name: "Glaciem Ring" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "How to get there" }),
  ).toBeVisible();
  await expect(page.getByText(/quantum travel to Delamar/i)).toBeVisible();
});

test("applies the Aaron Halo area rule to a Stanton mining base", async ({
  page,
}) => {
  await page.goto("/en/locations/stanton/mining-base-01k-i43");

  await expect(
    page.getByRole("heading", { name: "How to get there" }),
  ).toBeVisible();
  await expect(page.getByText(/inside the Aaron Halo/i)).toBeVisible();
  // Präzise QT-Drop-Route mit Ausstiegs-Distanz
  await expect(page.getByText("9,500,000 km")).toBeVisible();
});

test("does not show a guide on a body without curated arrival info", async ({
  page,
}) => {
  await page.goto("/en/locations/stanton/crusader");

  await expect(page.getByRole("heading", { name: "Crusader" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "How to get there" }),
  ).toHaveCount(0);
});
