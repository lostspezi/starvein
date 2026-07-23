import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  MiningGadget,
  MiningLaser,
  MiningModule,
} from "@/features/loadouts/equipment.schema";
import { renderWithIntl } from "@/test/render";
import { LaserBreakTable } from "./LaserBreakTable";

const patchVersion = "4.7";

const helixII: MiningLaser = {
  code: "helix-ii",
  name: "Helix II",
  manufacturer: "Thermyte Concern",
  size: 2,
  moduleSlots: 3,
  stats: {
    laserPower: 4080,
    extractionLaserPower: 2590,
    optimalRange: 30,
    maxRange: 90,
  },
  modifiers: { resistance: 0.7 },
  patchVersion,
};

const arborMh1: MiningLaser = {
  code: "arbor-mh1",
  name: "Arbor MH1",
  manufacturer: "Greycat Industrial",
  size: 1,
  moduleSlots: 1,
  stats: {
    laserPower: 1890,
    extractionLaserPower: 1850,
    optimalRange: 60,
    maxRange: 180,
  },
  modifiers: { resistance: 1.25 },
  patchVersion,
};

const surge: MiningModule = {
  code: "surge",
  name: "Surge",
  manufacturer: "Thermyte Concern",
  type: "active",
  charges: 7,
  durationSeconds: 15,
  modifiers: { laserPower: 1.5, instability: 1.1, resistance: 0.85 },
  patchVersion,
};

const sabir: MiningGadget = {
  code: "sabir",
  name: "Sabir",
  manufacturer: "Shubin Interstellar",
  modifiers: { instability: 1.15, resistance: 0.5, optimalChargeWindow: 1.5 },
  patchVersion,
};

function rowOf(name: string) {
  return screen.getByText(name).closest("tr") as HTMLTableRowElement;
}

describe("LaserBreakTable", () => {
  it("shows heads needed per laser for the entered rock", () => {
    renderWithIntl(
      <LaserBreakTable
        lasers={[helixII, arborMh1]}
        modules={[]}
        gadget={null}
        mass={30000}
        resistancePct={30}
      />,
    );
    // Helix II: required(2) = 6000/0.853 = 7034 ≤ 8160 → "2×"
    expect(within(rowOf("Helix II")).getByText("2×")).toBeInTheDocument();
  });

  it("marks unbreakable lasers", () => {
    renderWithIntl(
      <LaserBreakTable
        lasers={[arborMh1]}
        modules={[]}
        gadget={null}
        mass={100000}
        resistancePct={50}
      />,
    );
    expect(
      within(rowOf("Arbor MH1")).getByText("Not breakable"),
    ).toBeInTheDocument();
  });

  it("applies global modules and gadget to the verdict", () => {
    renderWithIntl(
      <LaserBreakTable
        lasers={[arborMh1]}
        modules={[]}
        gadget={sabir}
        mass={8000}
        resistancePct={20}
      />,
    );
    // Arbor MH1 alleine schafft required 2133 nicht,
    // mit Sabir (effRes 0.125 → 1828.57) schon
    expect(within(rowOf("Arbor MH1")).getByText("1×")).toBeInTheDocument();
  });

  it("applies a crafted-laser power bonus to power and verdict", () => {
    renderWithIntl(
      <LaserBreakTable
        lasers={[arborMh1]}
        modules={[]}
        gadget={null}
        mass={10000}
        resistancePct={20}
        laserPowerBonusPct={60}
      />,
    );
    // Arbor MH1: required(1) = 2000/0.75 = 2666.67 > 1890,
    // mit +60 % aber 3024 ≥ 2666.67
    const row = within(rowOf("Arbor MH1"));
    expect(row.getByText("3,024")).toBeInTheDocument();
    expect(row.getByText("1×")).toBeInTheDocument();
  });

  it("shows how many of the picked modules fit each laser's slots", () => {
    renderWithIntl(
      <LaserBreakTable
        lasers={[arborMh1]}
        modules={[surge, surge]}
        gadget={null}
        mass={30000}
        resistancePct={30}
      />,
    );
    // Arbor MH1 hat nur 1 Slot → "1/2" angewandte Module
    expect(within(rowOf("Arbor MH1")).getByText("1/2")).toBeInTheDocument();
  });

  it("renders the effective power in a mono font", () => {
    renderWithIntl(
      <LaserBreakTable
        lasers={[helixII]}
        modules={[]}
        gadget={null}
        mass={30000}
        resistancePct={30}
      />,
    );
    const power = within(rowOf("Helix II")).getByText("4,080");
    expect(power.className).toContain("font-mono");
  });

  it("renders an empty state without a valid rock", () => {
    renderWithIntl(
      <LaserBreakTable
        lasers={[helixII]}
        modules={[]}
        gadget={null}
        mass={null}
        resistancePct={30}
      />,
    );
    expect(screen.getByText("Enter mass and resistance")).toBeInTheDocument();
    expect(screen.queryByText("Helix II")).not.toBeInTheDocument();
  });
});
