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
      "summary_large_image",
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

test.describe("structured data", () => {
  async function readJsonLdBlocks(page: import("@playwright/test").Page) {
    const raw = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    return raw.map((text) => JSON.parse(text));
  }

  test("ore detail exposes a BreadcrumbList", async ({ page }) => {
    await page.goto("/en/ores/hada");
    const blocks = await readJsonLdBlocks(page);
    const breadcrumbs = blocks.find((b) => b["@type"] === "BreadcrumbList");
    expect(breadcrumbs).toBeTruthy();
    expect(breadcrumbs.itemListElement[0]).toMatchObject({
      position: 1,
      name: "Ores",
      item: `${SITE_URL}/en/ores`,
    });
    expect(breadcrumbs.itemListElement[1]).toMatchObject({
      position: 2,
      name: "Hadanite",
    });
  });

  test("location body page exposes a BreadcrumbList", async ({ page }) => {
    await page.goto("/en/locations/stanton/daymar");
    const blocks = await readJsonLdBlocks(page);
    const breadcrumbs = blocks.find((b) => b["@type"] === "BreadcrumbList");
    expect(breadcrumbs).toBeTruthy();
    const names = breadcrumbs.itemListElement.map(
      (item: { name: string }) => item.name,
    );
    expect(names).toContain("Stanton");
    expect(names[names.length - 1]).toBe("Daymar");
  });

  test("ore detail exposes a FAQPage mirroring the visible FAQ", async ({
    page,
  }) => {
    await page.goto("/en/ores/hada");
    const blocks = await readJsonLdBlocks(page);
    const faq = blocks.find((b) => b["@type"] === "FAQPage");
    expect(faq).toBeTruthy();
    expect(faq.mainEntity.length).toBeGreaterThan(0);
    const firstQuestion = faq.mainEntity[0].name as string;
    // Google verlangt, dass die Q&A auch sichtbar auf der Seite stehen.
    await expect(
      page.getByRole("heading", { name: /frequently asked questions/i }),
    ).toBeVisible();
    await expect(page.getByText(firstQuestion)).toBeVisible();
  });

  test("reference list pages expose a Dataset", async ({ page }) => {
    await page.goto("/en/occurrences");
    const blocks = await readJsonLdBlocks(page);
    const dataset = blocks.find((b) => b["@type"] === "Dataset");
    expect(dataset).toBeTruthy();
    expect(dataset.url).toBe(`${SITE_URL}/en/occurrences`);
    expect(dataset.isAccessibleForFree).toBe(true);
  });
});

test.describe("open graph images", () => {
  /** og:image trägt die Produktions-Domain (metadataBase) — gegen den lokalen Server auflösen. */
  async function fetchOgImage(
    page: import("@playwright/test").Page,
    request: import("@playwright/test").APIRequestContext,
    route: string,
  ) {
    await page.goto(route);
    const ogImage = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute("content");
    expect(ogImage).toBeTruthy();
    const url = new URL(ogImage!);
    return request.get(`${url.pathname}${url.search}`);
  }

  test("ore detail serves a rendered PNG og:image", async ({
    page,
    request,
  }) => {
    const response = await fetchOgImage(page, request, "/en/ores/hada");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
    // Die segment-eigene Karte muss den Locale-Fallback verdrängen
    expect(response.url()).toContain("/ores/hada/opengraph-image");
  });

  test("location body page serves a rendered PNG og:image", async ({
    page,
    request,
  }) => {
    const response = await fetchOgImage(
      page,
      request,
      "/en/locations/stanton/daymar",
    );
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  });

  test("pages without an own card fall back to the site default image", async ({
    page,
    request,
  }) => {
    const response = await fetchOgImage(page, request, "/en/signatures");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
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
    // Alle NO_INDEX-Seiten müssen auch auf robots-Ebene gesperrt sein
    for (const path of [
      "/*/favorites",
      "/*/admin",
      "/*/warehouse",
      "/*/inventory",
      "/*/refinery-jobs",
      "/*/device",
      "/*/loadouts/mine",
      "/*/loadouts/new",
      "/*/loadouts/*/edit",
      "/*/guides/mine",
      "/*/guides/new",
      "/*/guides/*/edit",
      "/*/blueprints/craftable",
    ]) {
      expect(body).toContain(`Disallow: ${path}`);
    }
  });

  test("sitemap.xml lists the crafting, guides and ships sections", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.ok()).toBe(true);

    const body = await response.text();
    expect(body).toContain(`${SITE_URL}/en/materials`);
    expect(body).toContain(`${SITE_URL}/en/blueprints`);
    expect(body).toContain(`${SITE_URL}/de/guides`);
    expect(body).toContain(`${SITE_URL}/de/ships`);
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

test.describe("ISR caching", () => {
  test("reference detail pages serve cacheable responses", async ({
    request,
  }) => {
    // s-maxage beweist, dass ISR wirklich greift — ein versteckter
    // headers()/searchParams-Zugriff würde die Seite still dynamisch machen.
    for (const route of [
      "/en/ores/hada",
      "/en/locations/stanton",
      "/en/locations/stanton/daymar",
    ]) {
      const response = await request.get(route);
      expect(response.ok()).toBe(true);
      expect(
        response.headers()["cache-control"],
        `cache-control of ${route}`,
      ).toContain("s-maxage");
    }
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
