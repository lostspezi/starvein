/**
 * Smoke-Test der HTTP-Security-Header (Härtung Juli 2026). e2e:server läuft als
 * `next start` (production), daher ist auch die CSP gesetzt (siehe
 * src/lib/security-headers.ts). Header-Namen liefert Playwright kleingeschrieben.
 */
import { expect, test } from "@playwright/test";

test("document responses carry the baseline security headers", async ({
  page,
}) => {
  const response = await page.goto("/en");
  expect(response).not.toBeNull();

  const headers = response!.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["permissions-policy"]).toContain("geolocation=()");
});

test("document responses enforce a content security policy in production", async ({
  page,
}) => {
  const response = await page.goto("/en");
  const csp = response!.headers()["content-security-policy"];

  expect(csp).toBeDefined();
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  // Guides betten YouTube ein, Avatare kommen von Discord — dürfen nicht blocken
  expect(csp).toContain("https://www.youtube.com");
  expect(csp).toContain("https://cdn.discordapp.com");
});
