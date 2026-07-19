import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { CompareGrid } from "./CompareGrid";
import type { OreComparisonColumn } from "./compare.service";

const quanColumn: OreComparisonColumn = {
  ore: {
    code: "QUAN",
    name_de: "Quantainium",
    name_en: "Quantainium",
    rarityTier: "legendary",
    mineableBy: { ship: true, roc: false, fps: false },
  },
  shipSignature: {
    oreCode: "QUAN",
    method: "ship",
    signatureValue: 3170,
    dominantCompositionRange: { min: 40, max: 80 },
    notes: "+ Beryl (10-20%)",
    patchVersion: "4.7",
    sourceType: "curated",
    confidenceScore: 0.6,
  },
  groundSignatures: [],
  bestRawSell: 88000,
  bestRefinedSell: 150000,
  topLocations: [
    {
      oreCode: "QUAN",
      systemCode: "STANTON",
      bodySlug: "aaron-halo",
      method: "ship",
      probabilityPercent: 8,
      patchVersion: "4.7",
      sourceType: "curated",
      confidenceScore: 0.3,
      lastVerifiedAt: "2026-07-09",
      bodyName: "Aaron Halo",
      bodyType: "asteroidBelt",
      bestRawSell: null,
      bestRefinedSell: null,
    },
  ],
};

const hadaColumn: OreComparisonColumn = {
  ore: {
    code: "HADA",
    name_de: "Hadanite",
    name_en: "Hadanite",
    rarityTier: "epic",
    mineableBy: { ship: false, roc: true, fps: true },
  },
  shipSignature: null,
  groundSignatures: [
    {
      oreCode: "HADA",
      method: "fps",
      signatureValue: 3000,
      patchVersion: "4.7",
      sourceType: "curated",
      confidenceScore: 0.6,
    },
    {
      oreCode: "HADA",
      method: "roc",
      signatureValue: 4000,
      patchVersion: "4.7",
      sourceType: "curated",
      confidenceScore: 0.6,
    },
  ],
  bestRawSell: null,
  bestRefinedSell: null,
  topLocations: [],
};

describe("CompareGrid", () => {
  it("renders one card per ore with signature and prices", () => {
    renderWithIntl(<CompareGrid columns={[quanColumn, hadaColumn]} />, {
      locale: "en",
    });

    const quanCard = screen.getByText("Quantainium").closest("article")!;
    expect(within(quanCard).getByText("3170")).toBeVisible();
    expect(within(quanCard).getByText("40–80%")).toBeVisible();
    expect(within(quanCard).getByText(/150[,.]000/)).toBeVisible();
    expect(
      within(quanCard).getByRole("link", { name: /Aaron Halo/ }),
    ).toHaveAttribute("href", "/locations/stanton/aaron-halo");

    const hadaCard = screen.getByText("Hadanite").closest("article")!;
    expect(within(hadaCard).getByText(/3000/)).toBeVisible();
    expect(within(hadaCard).getByText(/4000/)).toBeVisible();
    expect(within(hadaCard).getAllByText("–").length).toBeGreaterThan(0);
  });

  it("prompts for a selection without columns", () => {
    renderWithIntl(<CompareGrid columns={[]} />, { locale: "en" });
    expect(screen.getByText("Pick up to three ores to compare.")).toBeVisible();
  });
});
