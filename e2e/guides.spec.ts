/**
 * Guides-Happy-Path (Logged-out-Pfade): Public-Browse ohne Account, Editor
 * hinter Auth, Mutationen erfordern eine Session. Owner-/Admin-Logik und der
 * sichere Render-Pfad sind über die Integration- und Unit-Tests abgedeckt.
 */
import { expect, test } from "@playwright/test";

test("public guides page is browsable without an account", async ({ page }) => {
  await page.goto("/en/guides");

  await expect(
    page.getByRole("heading", { name: "Mining Guides" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Write a guide" })).toBeVisible();
});

test("guide editor asks for sign-in when logged out", async ({ page }) => {
  await page.goto("/en/guides/new");

  await expect(
    page.getByText("Sign in with Discord to write and edit guides", {
      exact: false,
    }),
  ).toBeVisible();
});

test("unknown guide details return the 404 page", async ({ page }) => {
  const response = await page.goto("/en/guides/does-not-exist");
  expect(response?.status()).toBe(404);
});

test("guides list offers the top-rated sort", async ({ page }) => {
  await page.goto("/en/guides");

  const sortGroup = page.getByRole("group", { name: "Sort" });
  await expect(
    sortGroup.getByRole("button", { name: "Top rated" }),
  ).toBeVisible();
});

test("guide votes require a session", async ({ request }) => {
  const vote = await request.post("/api/guides/some-id/vote");
  expect(vote.status()).toBe(401);
});

test("guide mutations require a session", async ({ request }) => {
  const create = await request.post("/api/guides", {
    data: {
      title: "Test",
      tags: [],
      isPublic: false,
      content: { type: "doc" },
    },
  });
  expect(create.status()).toBe(401);

  const edit = await request.patch("/api/guides/some-id", {
    data: { title: "Neu" },
  });
  expect(edit.status()).toBe(401);

  const remove = await request.delete("/api/guides/some-id");
  expect(remove.status()).toBe(401);

  const upload = await request.post("/api/guides/images");
  expect(upload.status()).toBe(401);
});
