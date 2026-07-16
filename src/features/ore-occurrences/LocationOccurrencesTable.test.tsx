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
    signatureValue: 3000,
  },
];

const shipRows: OccurrenceWithOre[] = [
  {
    oreCode: "QUAN",
    systemCode: "STANTON",
    bodySlug: "yela-belt",
    method: "ship",
    probabilityPercent: 6,
    patchVersion: "4.7",
    sourceType: "wiki",
    confidenceScore: 0.9,
    lastVerifiedAt: "2026-07-09",
    oreName: "Quantainium",
    rarityTier: "legendary",
    signatureValue: 3170,
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

  it("shows the signature value in its own column", () => {
    renderWithIntl(<LocationOccurrencesTable occurrences={shipRows} />, {
      locale: "en",
    });

    expect(
      screen.getByRole("columnheader", { name: "Signature" }),
    ).toBeVisible();
    expect(screen.getByText("3170")).toBeVisible();
  });

  it("shows a dash when no signature is known", () => {
    renderWithIntl(
      <LocationOccurrencesTable
        occurrences={[{ ...shipRows[0], signatureValue: undefined }]}
      />,
      { locale: "en" },
    );

    expect(screen.getByText("—")).toBeVisible();
  });

  it("notes that ground signatures only encode size when ROC/FPS rows exist", () => {
    renderWithIntl(<LocationOccurrencesTable occurrences={rows} />, {
      locale: "en",
    });

    expect(
      screen.getByText(/signature only indicates the size/i),
    ).toBeVisible();
  });

  it("omits the ground note for ship-only occurrences", () => {
    renderWithIntl(<LocationOccurrencesTable occurrences={shipRows} />, {
      locale: "en",
    });

    expect(
      screen.queryByText(/signature only indicates the size/i),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state", () => {
    renderWithIntl(<LocationOccurrencesTable occurrences={[]} />, {
      locale: "en",
    });
    expect(screen.getByText("No known occurrences yet.")).toBeVisible();
  });
});
