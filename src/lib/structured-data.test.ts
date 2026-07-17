import { describe, expect, it } from "vitest";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  websiteJsonLd,
} from "./structured-data";

describe("websiteJsonLd", () => {
  it("describes the site with both locales", () => {
    expect(websiteJsonLd("Mining reference")).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "STARVEIN",
      url: "https://starvein.app",
      description: "Mining reference",
      inLanguage: ["de", "en"],
    });
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers items from 1 and resolves absolute localized URLs", () => {
    expect(
      breadcrumbJsonLd("en", [
        { label: "Ores", href: "/ores" },
        { label: "Hadanite" },
      ]),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Ores",
          item: "https://starvein.app/en/ores",
        },
        { "@type": "ListItem", position: 2, name: "Hadanite" },
      ],
    });
  });
});

describe("articleJsonLd", () => {
  it("maps guide fields to an Article with author and keywords", () => {
    expect(
      articleJsonLd({
        locale: "de",
        path: "/guides/abc123",
        title: "Mining 101",
        description: "Einstieg ins Mining",
        language: "de",
        datePublished: "2026-07-01T00:00:00.000Z",
        dateModified: "2026-07-10T00:00:00.000Z",
        authorName: "lostspezi",
        tags: ["mining", "quantainium"],
      }),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Mining 101",
      description: "Einstieg ins Mining",
      inLanguage: "de",
      datePublished: "2026-07-01T00:00:00.000Z",
      dateModified: "2026-07-10T00:00:00.000Z",
      mainEntityOfPage: "https://starvein.app/de/guides/abc123",
      author: { "@type": "Person", name: "lostspezi" },
      keywords: "mining, quantainium",
    });
  });

  it("omits author, description and keywords when absent", () => {
    const jsonLd = articleJsonLd({
      locale: "en",
      path: "/guides/abc123",
      title: "Mining 101",
      language: "en",
      datePublished: "2026-07-01T00:00:00.000Z",
      dateModified: "2026-07-01T00:00:00.000Z",
      tags: [],
    });
    expect(jsonLd).not.toHaveProperty("author");
    expect(jsonLd).not.toHaveProperty("keywords");
    expect(jsonLd).not.toHaveProperty("description");
  });
});
