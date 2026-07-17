import { describe, expect, it } from "vitest";
import { localeAlternates, pageMetadata } from "./seo";

describe("pageMetadata", () => {
  const meta = pageMetadata({
    locale: "de",
    path: "/ores/hada",
    title: "Hadanite",
    description: "Wo Hadanit zu finden ist.",
  });

  it("uses the large twitter card so previews show the OG image", () => {
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("falls back to the locale-level default OG image", () => {
    expect(meta.openGraph).toMatchObject({
      images: [
        {
          url: "https://starvein.app/de/opengraph-image",
          width: 1200,
          height: 630,
        },
      ],
    });
  });

  it("omits the fallback image when the segment has its own OG file", () => {
    const withOwnImage = pageMetadata({
      locale: "en",
      path: "/ores/hada",
      title: "Hadanite",
      ownOgImage: true,
    });
    expect(withOwnImage.openGraph).not.toHaveProperty("images");
  });

  it("keeps canonical and hreflang alternates intact", () => {
    expect(meta.alternates?.canonical).toBe(
      "https://starvein.app/de/ores/hada",
    );
    expect(meta.alternates?.languages).toMatchObject({
      de: "https://starvein.app/de/ores/hada",
      en: "https://starvein.app/en/ores/hada",
      "x-default": "https://starvein.app/en/ores/hada",
    });
  });
});

describe("localeAlternates", () => {
  it("points x-default at the default locale", () => {
    const alternates = localeAlternates("de", "/signatures");
    expect(alternates?.languages?.["x-default"]).toBe(
      "https://starvein.app/en/signatures",
    );
  });
});
