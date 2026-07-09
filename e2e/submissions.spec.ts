/**
 * Slice-7-Happy-Path (Logged-out-Pfade): Community-Panel sichtbar,
 * Einreichen/Voten hinter Auth. Accept/Reject-Logik (Wilson-Score) ist
 * über die Integration-Tests der Submissions-Engine abgedeckt.
 */
import { expect, test } from "@playwright/test";

test("location page shows the community proposals panel", async ({ page }) => {
  await page.goto("/en/locations/stanton/daymar");

  await expect(
    page.getByRole("heading", { name: "Community proposals" }),
  ).toBeVisible();
  await expect(
    page.getByText("Sign in to submit proposals and vote."),
  ).toBeVisible();
});

test("submissions list is public, mutations are not", async ({ request }) => {
  const list = await request.get("/api/submissions?system=STANTON&body=daymar");
  expect(list.status()).toBe(200);

  const create = await request.post("/api/submissions", {
    data: {
      oreCode: "HADA",
      systemCode: "STANTON",
      bodySlug: "daymar",
      method: "fps",
      probabilityPercent: 42,
    },
  });
  expect(create.status()).toBe(401);

  const vote = await request.post("/api/submissions/vote", {
    data: { submissionId: "x", value: 1 },
  });
  expect(vote.status()).toBe(401);
});
