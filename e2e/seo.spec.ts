/**
 * SEO-Regressionstest: Canonical, hreflang, Open Graph, robots.txt,
 * sitemap.xml, Web-Manifest und Favicon-Set.
 *
 * Läuft gegen den Produktions-Build (baseURL aus playwright.config.ts).
 */
import { expect, test } from "@playwright/test";

const SITE_URL = "https://starvein.app";

test.describe("page metadata", () => {
  test("home (en) has localized title, description and canonical", async ({
    page,
  }) => {
    await page.goto("/en");

    await expect(page).toHaveTitle(/STARVEIN/);

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute("content", /Star Citizen/);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", `${SITE_URL}/en`);
  });

  test("home (de) has hreflang alternates incl. x-default", async ({
    page,
  }) => {
    await page.goto("/de");

    await expect(
      page.locator('link[rel="alternate"][hreflang="de"]'),
    ).toHaveAttribute("href", `${SITE_URL}/de`);
    await expect(
      page.locator('link[rel="alternate"][hreflang="en"]'),
    ).toHaveAttribute("href", `${SITE_URL}/en`);
    await expect(
      page.locator('link[rel="alternate"][hreflang="x-default"]'),
    ).toHaveAttribute("href", `${SITE_URL}/en`);
  });

  test("home has Open Graph and Twitter card tags", async ({ page }) => {
    await page.goto("/en");

    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /STARVEIN/,
    );
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      "content",
      "STARVEIN",
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      /summary/,
    );
  });

  test("home exposes WebSite JSON-LD", async ({ page }) => {
    await page.goto("/en");

    const jsonLd = page.locator('script[type="application/ld+json"]').first();
    const parsed = JSON.parse((await jsonLd.textContent()) ?? "{}");
    expect(parsed["@type"]).toBe("WebSite");
    expect(parsed.name).toBe("STARVEIN");
  });

  test("ore detail page has ore-specific title and canonical", async ({
    page,
  }) => {
    await page.goto("/en/ores/hada");

    await expect(page).toHaveTitle(/Hadanite/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${SITE_URL}/en/ores/hada`,
    );
  });

  test("titles differ between routes (no global static title)", async ({
    page,
  }) => {
    await page.goto("/en/ores");
    const oresTitle = await page.title();

    await page.goto("/en/signatures");
    const signaturesTitle = await page.title();

    expect(oresTitle).not.toBe(signaturesTitle);
  });

  test("user-specific pages are noindex", async ({ page }) => {
    for (const route of ["/en/favorites", "/en/loadouts/mine"]) {
      await page.goto(route);
      const robots = page.locator('meta[name="robots"]');
      await expect(robots).toHaveAttribute("content", /noindex/);
    }
  });
});

test.describe("crawler endpoints", () => {
  test("robots.txt allows crawling and links the sitemap", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt");
    expect(response.ok()).toBe(true);

    const body = await response.text();
    expect(body).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
    expect(body).toContain("Disallow: /api/");
  });

  test("sitemap.xml lists localized routes", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.ok()).toBe(true);

    const body = await response.text();
    expect(body).toContain(`${SITE_URL}/en`);
    expect(body).toContain(`${SITE_URL}/de/ores`);
    expect(body).toContain(`${SITE_URL}/en/signatures`);
  });

  test("web manifest is served with theme colors", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest.name).toContain("STARVEIN");
    expect(manifest.background_color).toBe("#0a0e1a");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });
});

test.describe("favicon set", () => {
  test("serves SVG icon, apple touch icon and favicon.ico", async ({
    page,
    request,
  }) => {
    await page.goto("/en");

    const svgIconHref = await page
      .locator('link[rel="icon"][type="image/svg+xml"]')
      .getAttribute("href");
    expect(svgIconHref).toBeTruthy();
    expect((await request.get(svgIconHref!)).ok()).toBe(true);

    const appleIconHref = await page
      .locator('link[rel="apple-touch-icon"]')
      .getAttribute("href");
    expect(appleIconHref).toBeTruthy();
    expect((await request.get(appleIconHref!)).ok()).toBe(true);

    expect((await request.get("/favicon.ico")).ok()).toBe(true);
  });
});
