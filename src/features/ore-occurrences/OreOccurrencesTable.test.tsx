import { fireEvent, screen } from "@testing-library/react";
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
    signatureValue: 3000,
    bestRawSell: 8500,
    bestRefinedSell: null,
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

  it("shows the base signature and best sell prices in the summary", () => {
    renderWithIntl(<OreOccurrencesTable occurrences={rows} />, {
      locale: "en",
    });

    expect(screen.getByText("3000")).toBeVisible();
    expect(screen.getByText("8,500")).toBeVisible();
  });

  it("reveals the full deposit-size cluster when a ground row is expanded", () => {
    renderWithIntl(<OreOccurrencesTable occurrences={rows} />, {
      locale: "en",
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Show signature cluster and prices",
      }),
    );

    expect(
      screen.getByText("Deposit size (not mineral-specific)"),
    ).toBeVisible();
    // 2× of 3000
    expect(screen.getByText("6,000")).toBeVisible();
    expect(screen.getByText(/depends on the location/i)).toBeVisible();
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
