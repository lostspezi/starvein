import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { SignatureClusterPanel } from "./SignatureClusterPanel";

describe("SignatureClusterPanel", () => {
  it("shows the 1×–4× cluster sums and prices for ship mining", () => {
    renderWithIntl(
      <SignatureClusterPanel
        method="ship"
        signatureValue={3600}
        dominantCompositionRange={{ min: 40, max: 80 }}
        rawSell={12400}
        refinedSell={16100}
      />,
      { locale: "en" },
    );

    expect(
      screen.getByText("Signature cluster (identifies mineral)"),
    ).toBeVisible();
    expect(screen.getByText("3,600")).toBeVisible();
    expect(screen.getByText("7,200")).toBeVisible();
    expect(screen.getByText("10,800")).toBeVisible();
    expect(screen.getByText("14,400")).toBeVisible();
    expect(screen.getByText("12,400")).toBeVisible();
    expect(screen.getByText("16,100")).toBeVisible();
    // Ship rows identify the mineral — no "depends on location" warning
    expect(
      screen.queryByText(/depends on the location/i),
    ).not.toBeInTheDocument();
  });

  it("labels ground mining as size-only and warns the mineral comes from the location", () => {
    renderWithIntl(
      <SignatureClusterPanel
        method="roc"
        signatureValue={4000}
        rawSell={null}
        refinedSell={null}
      />,
      { locale: "en" },
    );

    expect(
      screen.getByText("Deposit size (not mineral-specific)"),
    ).toBeVisible();
    expect(screen.getByText("8,000")).toBeVisible();
    expect(screen.getByText("16,000")).toBeVisible();
    expect(screen.getByText(/depends on the location/i)).toBeVisible();
    // Missing prices render as dashes
    expect(screen.getAllByText("–").length).toBeGreaterThanOrEqual(2);
  });

  it("shows the rock composition breakdown with the byproduct relation", () => {
    renderWithIntl(
      <SignatureClusterPanel
        method="ship"
        signatureValue={3600}
        rawSell={null}
        refinedSell={null}
        deposit={{
          type: "secondary",
          byproductOf: ["BEXA", "GOLD"],
          rocks: [
            {
              rockLabel: "Bexalite",
              isPrimary: false,
              oreCompositionPercent: { min: 2, max: 5 },
              dominantMaterialName: "Bexalite (Raw)",
              dominantMaterialOreCode: "BEXA",
            },
          ],
        }}
      />,
      { locale: "en" },
    );

    expect(screen.getByText("Rock composition")).toBeVisible();
    expect(screen.getByText(/Bexalite: 2–5\s?%/)).toBeVisible();
    expect(screen.getByText(/dominant: Bexalite \(Raw\)/)).toBeVisible();
    expect(
      screen.getByText(/Occurs here only as a byproduct of BEXA, GOLD/),
    ).toBeVisible();
  });

  it("shows the byproduct sentence without a rock list (explorer rows)", () => {
    renderWithIntl(
      <SignatureClusterPanel
        method="ship"
        signatureValue={3600}
        rawSell={null}
        refinedSell={null}
        deposit={{ type: "secondary", byproductOf: ["BEXA"], rocks: [] }}
      />,
      { locale: "en" },
    );

    expect(
      screen.getByText(/Occurs here only as a byproduct of BEXA/),
    ).toBeVisible();
    expect(screen.queryByText("Rock composition")).not.toBeInTheDocument();
  });

  it("omits the byproduct sentence for primary deposits", () => {
    renderWithIntl(
      <SignatureClusterPanel
        method="ship"
        signatureValue={3600}
        rawSell={null}
        refinedSell={null}
        deposit={{
          type: "primary",
          byproductOf: [],
          rocks: [
            {
              rockLabel: "Borase",
              isPrimary: true,
              oreCompositionPercent: { min: 24.3, max: 74.3 },
              dominantMaterialName: "Borase (Ore)",
              dominantMaterialOreCode: "BORA",
            },
          ],
        }}
      />,
      { locale: "en" },
    );

    expect(screen.getByText("Rock composition")).toBeVisible();
    expect(screen.queryByText(/byproduct of/i)).not.toBeInTheDocument();
  });

  it("scales a signature range across the cluster counts", () => {
    renderWithIntl(
      <SignatureClusterPanel
        method="fps"
        signatureRange={{ min: 3000, max: 3500 }}
        rawSell={5000}
        refinedSell={7000}
      />,
      { locale: "en" },
    );

    expect(screen.getByText("3,000–3,500")).toBeVisible();
    expect(screen.getByText("12,000–14,000")).toBeVisible();
  });
});
