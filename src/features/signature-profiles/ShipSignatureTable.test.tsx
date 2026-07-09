import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { ShipSignatureTable } from "./ShipSignatureTable";
import type { ShipSignatureRow } from "./ShipSignatureTable";

const rows: ShipSignatureRow[] = [
  {
    oreCode: "QUAN",
    method: "ship",
    signatureValue: 3170,
    dominantCompositionRange: { min: 40, max: 80 },
    notes: "+ Beryl (10-20%)",
    patchVersion: "4.7",
    sourceType: "curated",
    confidenceScore: 0.6,
    oreName: "Quantainium",
    rarityTier: "legendary",
  },
];

describe("ShipSignatureTable", () => {
  it("shows mineral, signature value, composition window and secondaries", () => {
    renderWithIntl(<ShipSignatureTable profiles={rows} />, { locale: "en" });

    expect(screen.getByRole("link", { name: /Quantainium/ })).toHaveAttribute(
      "href",
      "/ores/quan",
    );
    expect(screen.getByText("3170")).toBeVisible();
    expect(screen.getByText("40–80%")).toBeVisible();
    expect(screen.getByText("+ Beryl (10-20%)")).toBeVisible();
  });
});
