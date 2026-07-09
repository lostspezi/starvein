import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { OreSignatureInfo } from "./OreSignatureInfo";
import type { SignatureProfile } from "./signature-profiles.schema";

const shipProfile: SignatureProfile = {
  oreCode: "QUAN",
  method: "ship",
  signatureValue: 3170,
  dominantCompositionRange: { min: 40, max: 80 },
  notes: "+ Beryl (10-20%)",
  patchVersion: "4.7",
  sourceType: "curated",
  confidenceScore: 0.6,
};

const groundProfiles: SignatureProfile[] = [
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
];

describe("OreSignatureInfo", () => {
  it("shows the per-mineral signature for ship ores", () => {
    renderWithIntl(<OreSignatureInfo profiles={[shipProfile]} />, {
      locale: "en",
    });

    expect(screen.getByText("3170")).toBeVisible();
    expect(screen.getByText("40–80%")).toBeVisible();
  });

  it("explains size-only semantics for ground minerals", () => {
    renderWithIntl(<OreSignatureInfo profiles={groundProfiles} />, {
      locale: "en",
    });

    expect(screen.getByText("3000")).toBeVisible();
    expect(screen.getByText("4000")).toBeVisible();
    expect(
      screen.getByText(/does not identify the mineral/, { exact: false }),
    ).toBeVisible();
  });

  it("renders nothing without profiles", () => {
    const { container } = renderWithIntl(<OreSignatureInfo profiles={[]} />, {
      locale: "en",
    });
    expect(container).toBeEmptyDOMElement();
  });
});
