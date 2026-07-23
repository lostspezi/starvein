import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { BreakabilityPanel } from "./BreakabilityPanel";

const rows = [
  {
    oreCode: "QUAN",
    oreName: "Quantanium",
    resistancePct: 90,
    maxMass: 93908.2,
  },
  { oreCode: "GOLD", oreName: "Gold", resistancePct: 25, maxMass: 142740.5 },
  { oreCode: "COPP", oreName: "Copper", resistancePct: -70, maxMass: 594752.2 },
];

describe("BreakabilityPanel", () => {
  it("renders one row per ore with resistance and rounded max mass", () => {
    renderWithIntl(<BreakabilityPanel rows={rows} gadgetName={null} />, {
      locale: "en",
    });

    expect(screen.getByText("Breakable ores (max rock mass)")).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(4); // Header + 3 Erze
    expect(screen.getByText("Quantanium")).toBeVisible();
    expect(screen.getByText("90 %")).toBeVisible();
    expect(screen.getByText("93,908")).toBeVisible();
    // negative Resistenz behält ihr Vorzeichen
    expect(screen.getByText("-70 %")).toBeVisible();
    expect(screen.getByText("594,752")).toBeVisible();
  });

  it("marks ores that stay unbreakable at any mass", () => {
    renderWithIntl(
      <BreakabilityPanel
        rows={[
          {
            oreCode: "QUAN",
            oreName: "Quantanium",
            resistancePct: 95,
            maxMass: 0,
          },
        ]}
        gadgetName={null}
      />,
      { locale: "en" },
    );

    expect(screen.getByText("Not breakable")).toBeVisible();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("names the assumed gadget when one applies", () => {
    renderWithIntl(<BreakabilityPanel rows={rows} gadgetName="Sabir" />, {
      locale: "en",
    });

    expect(
      screen.getByText(/Assumes one Sabir placed on the rock/),
    ).toBeVisible();
  });

  it("shows no gadget note without an effective gadget", () => {
    renderWithIntl(<BreakabilityPanel rows={rows} gadgetName={null} />, {
      locale: "en",
    });

    expect(screen.queryByText(/placed on the rock/)).toBeNull();
  });

  it("shows the break-formula attribution", () => {
    renderWithIntl(<BreakabilityPanel rows={rows} gadgetName={null} />, {
      locale: "en",
    });

    expect(screen.getByText(/mort13\/BreakabilityChart/)).toBeVisible();
  });
});
