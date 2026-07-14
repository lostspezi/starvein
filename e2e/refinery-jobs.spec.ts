/**
 * Refinery-Jobs-Happy-Path (Logged-out-Pfade): Seiten rendern mit
 * Login-Hinweis, Mutationen verlangen eine Session. Der eingeloggte
 * Flow inkl. Collect-Transfer ist über Service- und Component-Tests
 * abgedeckt.
 */
import { expect, test } from "@playwright/test";

test("refinery jobs page asks for sign-in when logged out", async ({
  page,
}) => {
  await page.goto("/en/refinery-jobs");

  await expect(
    page.getByRole("heading", { name: "My refinery jobs" }),
  ).toBeVisible();
  await expect(
    page.getByText("Sign in to track your refinery jobs."),
  ).toBeVisible();
});

test("new job page asks for sign-in when logged out (German)", async ({
  page,
}) => {
  await page.goto("/de/refinery-jobs/new");

  await expect(
    page.getByRole("heading", { name: "Neuer Raffinerie-Job" }),
  ).toBeVisible();
  await expect(
    page.getByText("Melde dich an, um deine Raffinerie-Jobs zu tracken."),
  ).toBeVisible();
});

test("refinery job mutations require a session", async ({ request }) => {
  const create = await request.post("/api/refinery-jobs", {
    data: {
      terminalId: 32,
      methodCode: "DINYX",
      items: [{ oreCode: "QUAN", quantityScu: 32 }],
      durationMinutes: 90,
    },
  });
  expect(create.status()).toBe(401);

  const edit = await request.patch("/api/refinery-jobs/some-id", {
    data: { durationMinutes: 120 },
  });
  expect(edit.status()).toBe(401);

  const collect = await request.post("/api/refinery-jobs/some-id/collect", {
    data: {},
  });
  expect(collect.status()).toBe(401);

  const remove = await request.delete("/api/refinery-jobs/some-id");
  expect(remove.status()).toBe(401);
});
