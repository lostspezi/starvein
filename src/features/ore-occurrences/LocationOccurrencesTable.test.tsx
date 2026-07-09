import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { LocationOccurrencesTable } from "./LocationOccurrencesTable";
import type { OccurrenceWithOre } from "./ore-occurrences.service";

const rows: OccurrenceWithOre[] = [
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
  },
];

describe("LocationOccurrencesTable", () => {
  it("links the ore detail page and shows probability and method", () => {
    renderWithIntl(<LocationOccurrencesTable occurrences={rows} />, {
      locale: "en",
    });

    expect(screen.getByRole("link", { name: /Hadanite/ })).toHaveAttribute(
      "href",
      "/ores/hada",
    );
    expect(screen.getByText("20%")).toBeVisible();
    expect(screen.getByText("FPS")).toBeVisible();
  });

  it("shows the localized rarity", () => {
    renderWithIntl(<LocationOccurrencesTable occurrences={rows} />, {
      locale: "de",
    });
    expect(screen.getByText("Episch")).toBeVisible();
  });

  it("shows an empty state", () => {
    renderWithIntl(<LocationOccurrencesTable occurrences={[]} />, {
      locale: "en",
    });
    expect(screen.getByText("No known occurrences yet.")).toBeVisible();
  });
});
