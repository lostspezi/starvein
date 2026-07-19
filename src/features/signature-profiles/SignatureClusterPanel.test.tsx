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
