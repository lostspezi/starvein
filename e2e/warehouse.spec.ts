/**
 * Warehouse-Happy-Path (Logged-out-Pfade): Seite rendert mit
 * Login-Hinweis, Mutationen verlangen eine Session. Der eingeloggte
 * CRUD-Flow ist über Service- und Component-Tests abgedeckt.
 */
import { expect, test } from "@playwright/test";

test("warehouse page asks for sign-in when logged out", async ({ page }) => {
  await page.goto("/en/warehouse");

  await expect(
    page.getByRole("heading", { name: "My warehouse" }),
  ).toBeVisible();
  await expect(
    page.getByText("Sign in to manage your warehouse."),
  ).toBeVisible();
});

test("warehouse page renders in German", async ({ page }) => {
  await page.goto("/de/warehouse");

  await expect(page.getByRole("heading", { name: "Mein Lager" })).toBeVisible();
  await expect(
    page.getByText("Melde dich an, um dein Lager zu verwalten."),
  ).toBeVisible();
});

test("warehouse mutations require a session", async ({ request }) => {
  const create = await request.post("/api/warehouse", {
    data: {
      oreCode: "QUAN",
      kind: "raw",
      quantityScu: 10,
      location: { kind: "custom", label: "in my ship" },
    },
  });
  expect(create.status()).toBe(401);

  const edit = await request.patch("/api/warehouse/some-id", {
    data: { quantityScu: 5 },
  });
  expect(edit.status()).toBe(401);

  const move = await request.post("/api/warehouse/some-id/move", {
    data: { location: { kind: "custom", label: "in my ship" }, quantityScu: 5 },
  });
  expect(move.status()).toBe(401);

  const remove = await request.delete("/api/warehouse/some-id");
  expect(remove.status()).toBe(401);
});
