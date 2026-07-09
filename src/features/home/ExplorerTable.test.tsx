import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { ExplorerTable } from "./ExplorerTable";
import type { ExplorerRow } from "./explorer.service";

const rows: ExplorerRow[] = [
  {
    oreCode: "GOLD",
    systemCode: "PYRO",
    bodySlug: "monox",
    method: "ship",
    probabilityPercent: 12,
    patchVersion: "4.7",
    sourceType: "curated",
    confidenceScore: 0.3,
    lastVerifiedAt: "2026-07-09",
    oreName: "Gold",
    rarityTier: "rare",
    bodyName: "Monox",
    bodyType: "planet",
    bestRefinedSell: 28000,
  },
  {
    oreCode: "HADA",
    systemCode: "STANTON",
    bodySlug: "daymar",
    method: "fps",
    probabilityPercent: 20,
    patchVersion: "4.7",
    sourceType: "curated",
    confidenceScore: 0.3,
    lastVerifiedAt: "2026-07-09",
    oreName: "Hadanite",
    rarityTier: "epic",
    bodyName: "Daymar",
    bodyType: "moon",
    bestRefinedSell: null,
  },
];

describe("ExplorerTable", () => {
  it("links ores and locations", () => {
    renderWithIntl(
      <ExplorerTable
        rows={rows}
        favoriteKeys={new Set()}
        isAuthenticated={false}
      />,
      { locale: "en" },
    );

    expect(screen.getByRole("link", { name: /Gold/ })).toHaveAttribute(
      "href",
      "/ores/gold",
    );
    expect(screen.getByRole("link", { name: /Monox/ })).toHaveAttribute(
      "href",
      "/locations/pyro/monox",
    );
  });

  it("shows probability and best refined sell, dash without price", () => {
    renderWithIntl(
      <ExplorerTable
        rows={rows}
        favoriteKeys={new Set()}
        isAuthenticated={false}
      />,
      { locale: "en" },
    );

    expect(screen.getByText("12%")).toBeVisible();
    expect(screen.getByText(/28[,.]000/)).toBeVisible();
    expect(screen.getByText("–")).toBeVisible();
  });

  it("hides the method column below sm", () => {
    renderWithIntl(
      <ExplorerTable
        rows={rows}
        favoriteKeys={new Set()}
        isAuthenticated={false}
      />,
      { locale: "en" },
    );

    const methodCell = screen.getByText("Ship");
    expect(methodCell.closest("td")).toHaveClass("hidden", "sm:table-cell");
  });

  it("shows favorite stars only for signed-in users", () => {
    const { unmount } = renderWithIntl(
      <ExplorerTable
        rows={rows}
        favoriteKeys={new Set(["PYRO|monox"])}
        isAuthenticated
      />,
      { locale: "en" },
    );
    expect(
      screen.getByRole("button", { name: "Remove favorite" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Save as favorite" }),
    ).toBeVisible();
    unmount();

    renderWithIntl(
      <ExplorerTable
        rows={rows}
        favoriteKeys={new Set()}
        isAuthenticated={false}
      />,
      { locale: "en" },
    );
    expect(
      screen.queryByRole("button", { name: /favorite/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state when no rows match", () => {
    renderWithIntl(
      <ExplorerTable
        rows={[]}
        favoriteKeys={new Set()}
        isAuthenticated={false}
      />,
      { locale: "en" },
    );
    expect(
      screen.getByText("No occurrences match these filters."),
    ).toBeVisible();
  });
});
