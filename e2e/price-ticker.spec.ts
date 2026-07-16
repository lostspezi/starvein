/**
 * Preisticker-Happy-Path: Laufband unter dem Header mit Refined-Sell je Erz
 * und Vortagesindikator. Die E2E-DB darf ungesynct sein (wie prices.spec.ts):
 * ohne Daten rendert der Ticker bewusst gar nichts.
 *
 * Playwright läuft global mit reducedMotion: "reduce" — geprüft wird hier
 * also der statische Fallback (Marquee-Animation aus, Streifen scrollbar);
 * der animierte Pfad wird manuell verifiziert.
 */
import { expect, test } from "@playwright/test";

test("ticker API returns the entry contract", async ({ request }) => {
  const response = await request.get("/api/price-ticker");
  expect(response.status()).toBe(200);

  const entries = await response.json();
  expect(Array.isArray(entries)).toBe(true);
  for (const entry of entries) {
    expect(entry).toMatchObject({
      oreCode: expect.any(String),
      nameDe: expect.any(String),
      nameEn: expect.any(String),
      bestSell: expect.any(Number),
    });
  }
});

test("ticker bar shows entries below the header — or nothing without data", async ({
  page,
  request,
}) => {
  const entries = await (await request.get("/api/price-ticker")).json();

  await page.goto("/en");
  const region = page.getByRole("region", { name: "Live commodity prices" });

  if (entries.length === 0) {
    await expect(region).toHaveCount(0);
    return;
  }

  await expect(region).toBeVisible();
  const first = entries[0];
  await expect(region.getByText(first.nameEn).first()).toBeVisible();
  await expect(region.getByText("aUEC/SCU").first()).toBeVisible();
});
