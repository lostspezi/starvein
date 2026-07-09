import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { OreOccurrencesTable } from "./OreOccurrencesTable";
import type { OccurrenceWithLocation } from "./ore-occurrences.service";

const rows: OccurrenceWithLocation[] = [
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
    bodyName: "Daymar",
    bodyType: "moon",
  },
];

describe("OreOccurrencesTable", () => {
  it("links the location and shows probability, method and body type", () => {
    renderWithIntl(<OreOccurrencesTable occurrences={rows} />, {
      locale: "en",
    });

    expect(screen.getByRole("link", { name: /Daymar/ })).toHaveAttribute(
      "href",
      "/locations/stanton/daymar",
    );
    expect(screen.getByText("20%")).toBeVisible();
    expect(screen.getByText("FPS")).toBeVisible();
    expect(screen.getByText("Moon")).toBeVisible();
  });

  it("marks low-confidence curated entries as unverified", () => {
    renderWithIntl(<OreOccurrencesTable occurrences={rows} />, {
      locale: "de",
    });
    expect(screen.getByText("unbestätigt")).toBeVisible();
  });

  it("shows an empty state", () => {
    renderWithIntl(<OreOccurrencesTable occurrences={[]} />, { locale: "en" });
    expect(screen.getByText("No known occurrences yet.")).toBeVisible();
  });
});
