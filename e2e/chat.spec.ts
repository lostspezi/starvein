/**
 * Chat-Happy-Path (Logged-out-Pfade): Aside öffnen/schließen mit
 * localStorage-Persistenz, Lesen öffentlich, Senden hinter Auth.
 * Filter-Pipeline (Wortfilter, Spam, Slow-Mode) ist über die
 * Integration-Tests des Chat-Service abgedeckt.
 */
import { expect, test } from "@playwright/test";

test("opens and closes the community chat with persisted state", async ({
  page,
}) => {
  await page.goto("/en");

  const openToggle = page.getByRole("button", { name: "Open chat" });
  await expect(openToggle).toBeVisible();

  await openToggle.click();
  const aside = page.getByRole("complementary", { name: "Community chat" });
  await expect(aside).toBeVisible();
  await expect(page.getByText("No messages yet — say hello!")).toBeVisible();
  await expect(
    page.getByText("Sign in with Discord to join the chat."),
  ).toBeVisible();

  // Offen-Zustand überlebt einen Reload (localStorage)
  await page.reload();
  await expect(
    page.getByRole("complementary", { name: "Community chat" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Close chat" }).click();
  await expect(aside).not.toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Open chat" })).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Community chat" }),
  ).not.toBeVisible();
});

test("reading messages is public, sending is not", async ({ request }) => {
  const list = await request.get("/api/chat/messages");
  expect(list.status()).toBe(200);

  const send = await request.post("/api/chat/messages", {
    data: { body: "hallo" },
  });
  expect(send.status()).toBe(401);
});
