import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { ForStreamersContent } from "./ForStreamersContent";

describe("ForStreamersContent", () => {
  it("pitches all four streamer benefits", () => {
    renderWithIntl(<ForStreamersContent />);
    expect(
      screen.getByText(
        "Capture refinery jobs without interrupting your stream",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("Links that look good in chat and on Discord"),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Build your own overlays and chatbots with the community API",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("Guides and loadouts to link below your VOD"),
    ).toBeVisible();
  });

  it("deep-links every benefit into the matching section", () => {
    renderWithIntl(<ForStreamersContent />);
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    for (const path of ["/companion", "/ores", "/api-docs", "/guides"]) {
      expect(hrefs).toContain(path);
    }
  });

  it("shows the FAQ visibly and mirrors it as FAQPage JSON-LD", () => {
    const { container } = renderWithIntl(<ForStreamersContent />);
    expect(screen.getByText("Can I show STARVEIN on my stream?")).toBeVisible();
    expect(screen.getByText(/never reads game memory/i)).toBeVisible();

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).not.toBeNull();
    const jsonLd = JSON.parse(script!.innerHTML) as {
      "@type": string;
      mainEntity: unknown[];
    };
    expect(jsonLd["@type"]).toBe("FAQPage");
    expect(jsonLd.mainEntity).toHaveLength(4);
  });

  it("renders in German", () => {
    renderWithIntl(<ForStreamersContent />, { locale: "de" });
    expect(
      screen.getByText("Darf ich STARVEIN in meinem Stream zeigen?"),
    ).toBeVisible();
    expect(screen.getByText(/liest keinen Spielspeicher/i)).toBeVisible();
  });
});
