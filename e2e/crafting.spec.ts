/**
 * Slice-D/E/F-Happy-Path (Logged-out-Pfade): Inventar- und Craftable-Seite
 * rendern mit Login-Hinweis, Mutationen verlangen eine Session. Der
 * eingeloggte Flow ist über Service-, Repository- und Component-Tests
 * abgedeckt (vgl. warehouse.spec.ts).
 */
import { expect, test } from "@playwright/test";

test("inventory page asks for sign-in when logged out", async ({ page }) => {
  await page.goto("/en/inventory");

  await expect(
    page.getByRole("heading", { name: "My Materials" }),
  ).toBeVisible();
  await expect(
    page.getByText("Sign in to track your material inventory."),
  ).toBeVisible();
});

test("craftable page asks for sign-in when logged out", async ({ page }) => {
  await page.goto("/en/blueprints/craftable");

  await expect(
    page.getByRole("heading", { name: "What can I craft?" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Sign in and fill your material inventory to see what you can craft.",
    ),
  ).toBeVisible();
});

test("craftable page renders in German", async ({ page }) => {
  await page.goto("/de/blueprints/craftable");

  await expect(
    page.getByRole("heading", { name: "Was kann ich craften?" }),
  ).toBeVisible();
});

test("blueprint collection mutations require a session", async ({
  request,
}) => {
  const list = await request.get("/api/blueprint-collection");
  expect(list.status()).toBe(401);

  const collect = await request.post("/api/blueprint-collection", {
    data: { blueprintKey: "BP_CRAFT_AMRS_LaserCannon_S1" },
  });
  expect(collect.status()).toBe(401);

  const uncollect = await request.delete("/api/blueprint-collection", {
    data: { blueprintKey: "BP_CRAFT_AMRS_LaserCannon_S1" },
  });
  expect(uncollect.status()).toBe(401);
});

test("material inventory mutations require a session", async ({ request }) => {
  const list = await request.get("/api/material-inventory");
  expect(list.status()).toBe(401);

  const set = await request.put("/api/material-inventory", {
    data: { materialCode: "AGRI", quantity: 5 },
  });
  expect(set.status()).toBe(401);
});

test("blueprint detail hides the collect toggle for anonymous users", async ({
  page,
}) => {
  await page.goto("/en/blueprints/bp_craft_amrs_lasercannon_s1");

  await expect(
    page.getByRole("heading", { name: /Omnisky III Cannon/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mark blueprint as collected" }),
  ).toHaveCount(0);
});

test("the wiki sync endpoint rejects requests without the secret", async ({
  request,
}) => {
  const response = await request.post("/api/sync-wiki");
  expect(response.status()).toBe(401);
});
