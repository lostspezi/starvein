/**
 * Public-API-Slice: Doku-Seite mit Quickstart + selbst-gehosteter
 * Scalar-Referenz, keyless OpenAPI-Spec und Key-Pflicht auf /api/v1.
 * (Branding-Compliance läuft separat über routes.ts.)
 */
import { expect, test } from "@playwright/test";

test("api docs page shows quickstart and mounts scalar", async ({ page }) => {
  await page.goto("/en/api-docs");

  await expect(
    page.getByRole("heading", { name: "Community API" }),
  ).toBeVisible();
  await expect(page.getByText("Quickstart")).toBeVisible();
  await expect(page.getByText(/curl -H "Authorization: Bearer/)).toBeVisible();

  // Scalar lädt aus /public/vendor (kein CDN) und rendert die Referenz
  await expect(page.locator("script#api-reference")).toHaveAttribute(
    "data-url",
    "/api/v1/openapi.json",
  );
  await expect(
    page.locator("[data-v-app], .scalar-app, .scalar-api-reference").first(),
  ).toBeAttached({ timeout: 20_000 });
});

test("openapi spec is served keyless with CORS", async ({ request }) => {
  const response = await request.get("/api/v1/openapi.json");
  expect(response.status()).toBe(200);
  expect(response.headers()["access-control-allow-origin"]).toBe("*");

  const doc = await response.json();
  expect(doc.openapi).toMatch(/^3\.1\./);
  expect(doc.paths["/ores"]).toBeDefined();
});

test("v1 endpoints require an api key", async ({ request }) => {
  const response = await request.get("/api/v1/ores");
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ error: "invalid api key" });
  expect(response.headers()["access-control-allow-origin"]).toBe("*");
});
