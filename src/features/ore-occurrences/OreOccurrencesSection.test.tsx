import { screen } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import type { OccurrenceWithLocation } from "./ore-occurrences.service";
import { OreOccurrencesSection } from "./OreOccurrencesSection";

function occurrence(
  overrides: Partial<OccurrenceWithLocation>,
): OccurrenceWithLocation {
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
    bodyName: "Daymar",
    bodyType: "moon",
    bestRawSell: null,
    bestRefinedSell: null,
    ...overrides,
  };
}

const occurrences = [
  // bewusst OHNE depositType (Legacy) — darf beim primary-Filter nicht verschwinden
  occurrence({ bodySlug: "daymar", bodyName: "Daymar", method: "fps" }),
  occurrence({
    bodySlug: "lyria",
    bodyName: "Lyria",
    method: "roc",
    depositType: "secondary",
  }),
];

function renderSection(searchParams = "") {
  return renderWithIntl(
    <NuqsTestingAdapter searchParams={searchParams}>
      <OreOccurrencesSection occurrences={occurrences} />
    </NuqsTestingAdapter>,
    { locale: "en" },
  );
}

describe("OreOccurrencesSection", () => {
  it("shows all occurrences and the method filter without URL state", () => {
    renderSection();
    expect(screen.getByText("Daymar")).toBeVisible();
    expect(screen.getByText("Lyria")).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Filter by mining method" }),
    ).toBeVisible();
  });

  it("filters client-side by method from the URL", () => {
    renderSection("?method=roc");
    expect(screen.getByText("Lyria")).toBeVisible();
    expect(screen.queryByText("Daymar")).not.toBeInTheDocument();
  });

  it("filters client-side by deposit type keeping legacy rows", () => {
    renderSection("?deposit=primary");
    expect(screen.getByText("Daymar")).toBeVisible();
    expect(screen.queryByText("Lyria")).not.toBeInTheDocument();
  });
});
