/**
 * Happy-Path der "Für Streamer"-Landing-Page: Nutzen-Panels mit
 * Deep-Links und sichtbarer FAQ-Block. (Branding-Compliance läuft
 * separat über routes.ts.)
 */
import { expect, test } from "@playwright/test";

test("for-streamers page pitches the benefits with deep links", async ({
  page,
}) => {
  await page.goto("/en/for-streamers");

  await expect(
    page.getByRole("heading", { name: "STARVEIN for streamers" }),
  ).toBeVisible();
  await expect(
    page.getByText("Capture refinery jobs without interrupting your stream"),
  ).toBeVisible();

  const apiLink = page.getByRole("link", { name: "Read the API docs" });
  await expect(apiLink).toBeVisible();
  await expect(apiLink).toHaveAttribute("href", "/en/api-docs");

  // FAQ sichtbar (Pflicht für das FAQPage-JSON-LD)
  await expect(
    page.getByText("Can I show STARVEIN on my stream?"),
  ).toBeVisible();
});

test("for-streamers page renders in German with footer link", async ({
  page,
}) => {
  await page.goto("/de/for-streamers");

  await expect(
    page.getByRole("heading", { name: "STARVEIN für Streamer" }),
  ).toBeVisible();
  await expect(
    page.getByText("Darf ich STARVEIN in meinem Stream zeigen?"),
  ).toBeVisible();
  await expect(
    page.getByRole("contentinfo").getByRole("link", { name: "Für Streamer" }),
  ).toBeVisible();
});
