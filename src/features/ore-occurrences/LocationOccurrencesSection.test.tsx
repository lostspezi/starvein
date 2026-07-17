import { screen } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import type { OccurrenceWithOre } from "./ore-occurrences.service";
import { LocationOccurrencesSection } from "./LocationOccurrencesSection";

function occurrence(overrides: Partial<OccurrenceWithOre>): OccurrenceWithOre {
  return {
    oreCode: "HADA",
    systemCode: "STANTON",
    bodySlug: "daymar",
    method: "fps",
    probabilityPercent: 30,
    patchVersion: "4.7",
    sourceType: "wiki",
    confidenceScore: 0.9,
    lastVerifiedAt: "2026-07-09",
    oreName: "Hadanite",
    rarityTier: "epic",
    bestRawSell: null,
    bestRefinedSell: null,
    ...overrides,
  };
}

const occurrences = [
  occurrence({ oreCode: "HADA", oreName: "Hadanite", method: "fps" }),
  occurrence({ oreCode: "QUAN", oreName: "Quantainium", method: "ship" }),
];

function renderSection(
  searchParams = "",
  inheritedFromName: string | null = null,
) {
  return renderWithIntl(
    <NuqsTestingAdapter searchParams={searchParams}>
      <LocationOccurrencesSection
        occurrences={occurrences}
        inheritedFromName={inheritedFromName}
      />
    </NuqsTestingAdapter>,
    { locale: "en" },
  );
}

describe("LocationOccurrencesSection", () => {
  it("shows all occurrences without URL state", () => {
    renderSection();
    expect(screen.getByText("Hadanite")).toBeVisible();
    expect(screen.getByText("Quantainium")).toBeVisible();
  });

  it("filters client-side by method from the URL", () => {
    renderSection("?method=ship");
    expect(screen.getByText("Quantainium")).toBeVisible();
    expect(screen.queryByText("Hadanite")).not.toBeInTheDocument();
  });

  it("shows the inheritance note when occurrences come from a parent body", () => {
    renderSection("", "Daymar");
    expect(screen.getByText(/Daymar/)).toBeVisible();
  });
});
