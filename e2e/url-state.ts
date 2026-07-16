import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Klickt ein URL-State-Control (nuqs-Filter, Pagination) und wartet, bis die
 * URL tatsächlich umgesprungen ist.
 *
 * Ein Klick vor abgeschlossener React-Hydration verpufft — der onClick hängt
 * dann noch nicht am Button und die URL bleibt stehen. Genau dieses Rennen
 * beschreibt playwright.config.ts für die URL-State-Tests; unter Last (kalter
 * next-build, parallele Worker) schlägt es zu. Deshalb wird der Klick per
 * toPass() wiederholt, bis die URL passt — dieselbe Strategie wie searchFor()
 * in search.spec.ts.
 */
export async function clickForUrl(
  page: Page,
  control: Locator,
  expectedUrl: RegExp,
): Promise<void> {
  await expect(async () => {
    await control.click();
    await expect(page).toHaveURL(expectedUrl, { timeout: 2_000 });
  }).toPass();
}
