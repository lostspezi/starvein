/**
 * Happy-Path (Logged-out-Pfad): Die Sammlungs-Übersicht rendert mit
 * Login-Hinweis. Der eingeloggte Flow (Craftability der gesammelten Blueprints
 * aus dem Lagerbestand) ist über Service-, Filter- und Component-Tests
 * abgedeckt (vgl. crafting.spec.ts / warehouse.spec.ts).
 */
import { expect, test } from "@playwright/test";

test("collected blueprints page asks for sign-in when logged out", async ({
  page,
}) => {
  await page.goto("/en/blueprints/collected");

  await expect(
    page.getByRole("heading", { name: "My Collected Blueprints" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Sign in to see your collected blueprints and what you can craft.",
    ),
  ).toBeVisible();
});

test("collected blueprints page renders in German", async ({ page }) => {
  await page.goto("/de/blueprints/collected");

  await expect(
    page.getByRole("heading", { name: "Meine gesammelten Blueprints" }),
  ).toBeVisible();
});
