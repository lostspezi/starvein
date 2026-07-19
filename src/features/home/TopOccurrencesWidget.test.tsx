import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import type { ExplorerRow } from "./explorer.service";
import { TopOccurrencesWidget } from "./TopOccurrencesWidget";

const rows: ExplorerRow[] = [
  {
    oreCode: "HADA",
    systemCode: "STANTON",
    bodySlug: "daymar",
    method: "fps",
    probabilityPercent: 60,
    patchVersion: "4.7",
    sourceType: "wiki",
    confidenceScore: 0.9,
    lastVerifiedAt: "2026-07-09",
    oreName: "Hadanite",
    rarityTier: "epic",
    bodyName: "Daymar",
    bodyType: "moon",
    bestRawSell: null,
    bestRefinedSell: null,
  },
  {
    oreCode: "GOLD",
    systemCode: "PYRO",
    bodySlug: "monox",
    method: "ship",
    probabilityPercent: 42,
    patchVersion: "4.7",
    sourceType: "wiki",
    confidenceScore: 0.9,
    lastVerifiedAt: "2026-07-09",
    oreName: "Gold",
    rarityTier: "rare",
    bodyName: "Monox",
    bodyType: "planet",
    bestRawSell: 19000,
    bestRefinedSell: 28000,
  },
];

function renderWidget() {
  renderWithIntl(
    <TopOccurrencesWidget
      rows={rows}
      total={2499}
      favoriteKeys={new Set<string>()}
      isAuthenticated={false}
    />,
    { locale: "en" },
  );
}

describe("TopOccurrencesWidget", () => {
  it("shows the heading and one row per ore", () => {
    renderWidget();
    expect(
      screen.getByRole("heading", { name: "Top occurrences" }),
    ).toBeVisible();
    expect(screen.getByText("Hadanite")).toBeVisible();
    expect(screen.getByText("Gold")).toBeVisible();
  });

  it("links to the full occurrences page with the total count", () => {
    renderWidget();
    const link = screen.getByRole("link", {
      name: "View all 2499 occurrences",
    });
    expect(link).toHaveAttribute("href", "/occurrences");
  });
});
