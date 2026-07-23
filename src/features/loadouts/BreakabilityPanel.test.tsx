import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { BreakabilityPanel } from "./BreakabilityPanel";

const tiers = [
  { resistancePct: 0, maxMass: 178425.66 },
  { resistancePct: 25, maxMass: 142740.53 },
  { resistancePct: 50, maxMass: 118950.44 },
  { resistancePct: 75, maxMass: 101957.52 },
];

describe("BreakabilityPanel", () => {
  it("renders one row per resistance tier with the rounded mass", () => {
    renderWithIntl(<BreakabilityPanel tiers={tiers} gadgetName={null} />, {
      locale: "en",
    });

    expect(screen.getByText("Max breakable rock mass")).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(5); // Header + 4 Tiers
    expect(screen.getByText("0 %")).toBeVisible();
    expect(screen.getByText("75 %")).toBeVisible();
    expect(screen.getByText("178,426")).toBeVisible();
    expect(screen.getByText("101,958")).toBeVisible();
  });

  it("names the assumed gadget when one applies", () => {
    renderWithIntl(<BreakabilityPanel tiers={tiers} gadgetName="Sabir" />, {
      locale: "en",
    });

    expect(
      screen.getByText(/Assumes one Sabir placed on the rock/),
    ).toBeVisible();
  });

  it("shows no gadget note without an effective gadget", () => {
    renderWithIntl(<BreakabilityPanel tiers={tiers} gadgetName={null} />, {
      locale: "en",
    });

    expect(screen.queryByText(/placed on the rock/)).toBeNull();
  });

  it("shows the break-formula attribution", () => {
    renderWithIntl(<BreakabilityPanel tiers={tiers} gadgetName={null} />, {
      locale: "en",
    });

    expect(screen.getByText(/mort13\/BreakabilityChart/)).toBeVisible();
  });
});
