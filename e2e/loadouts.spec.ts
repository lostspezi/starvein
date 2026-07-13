/**
 * Loadouts-Happy-Path (Logged-out-Pfade): Public-Browse ohne Account,
 * Builder und Mutationen hinter Auth. Vote-Reset, Owner-Checks und
 * Kompatibilitätslogik sind über die Integration-Tests abgedeckt.
 */
import { expect, test } from "@playwright/test";

test("public loadouts page is browsable without an account", async ({
  page,
}) => {
  await page.goto("/en/loadouts");

  await expect(
    page.getByRole("heading", { name: "Mining Loadouts" }),
  ).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Find loadouts" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Filter by mining method" }),
  ).toBeVisible();
});

test("builder page asks for sign-in when logged out", async ({ page }) => {
  await page.goto("/en/loadouts/new");

  await expect(
    page.getByText("Sign in with Discord to build and save loadouts", {
      exact: false,
    }),
  ).toBeVisible();
});

test("unknown loadout details return the 404 page", async ({ page }) => {
  const response = await page.goto("/en/loadouts/does-not-exist");
  expect(response?.status()).toBe(404);
});

test("loadout mutations require a session", async ({ request }) => {
  const create = await request.post("/api/loadouts", {
    data: {
      name: "Test",
      method: "ship",
      vehicleCode: "mole",
      hardpoints: [],
      gadgetCodes: [],
      isPublic: false,
    },
  });
  expect(create.status()).toBe(401);

  const edit = await request.patch("/api/loadouts/some-id", {
    data: { name: "Neu" },
  });
  expect(edit.status()).toBe(401);

  const vote = await request.post("/api/loadouts/some-id/vote");
  expect(vote.status()).toBe(401);
});
