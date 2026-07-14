/**
 * Slice-D1-Happy-Path (Logged-out-Pfade): Device-Flow-Endpunkte der
 * Desktop-App und die /device-Bestätigungsseite. Der echte Approve braucht
 * eine Discord-Session und ist bewusst nicht Teil der deterministischen E2E
 * (abgedeckt durch Integration- und Component-Tests).
 */
import { expect, test } from "@playwright/test";

test("device page asks anonymous users to sign in", async ({ page }) => {
  await page.goto("/en/device?user_code=ABCD-EFGH");
  await expect(
    page.getByText("Sign in with Discord to connect the companion app."),
  ).toBeVisible();
});

test("device code endpoint issues codes for the companion client", async ({
  request,
}) => {
  const response = await request.post("/api/auth/device/code", {
    data: { client_id: "starvein-companion" },
  });
  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.device_code).toBeTruthy();
  expect(json.user_code).toBeTruthy();
});

test("token polling reports authorization_pending before approval", async ({
  request,
}) => {
  const codeResponse = await request.post("/api/auth/device/code", {
    data: { client_id: "starvein-companion" },
  });
  const { device_code } = await codeResponse.json();

  const tokenResponse = await request.post("/api/auth/device/token", {
    data: {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code,
      client_id: "starvein-companion",
    },
  });
  expect(tokenResponse.status()).toBe(400);
  const json = await tokenResponse.json();
  expect(json.error).toBe("authorization_pending");
});

test("device code endpoint rejects unknown clients", async ({ request }) => {
  const response = await request.post("/api/auth/device/code", {
    data: { client_id: "evil-app" },
  });
  expect(response.status()).toBe(400);
});
