import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import type { MiningLaser, MiningModule } from "./equipment.schema";
import { HardpointBreakdown } from "./HardpointBreakdown";
import { aggregateHardpointStats } from "./loadout-stats";

const laser: MiningLaser = {
  code: "helix-ii",
  name: "Helix II",
  manufacturer: "Thermyte Concern",
  size: 2,
  moduleSlots: 3,
  stats: {
    laserPower: 4000,
    extractionLaserPower: 800,
    optimalRange: 30,
    maxRange: 90,
  },
  modifiers: { resistance: 0.7 },
  patchVersion: "4.7",
};

const surge: MiningModule = {
  code: "surge",
  name: "Surge",
  manufacturer: "Thermyte Concern",
  type: "active",
  charges: 7,
  durationSeconds: 15,
  modifiers: { laserPower: 1.5 },
  patchVersion: "4.7",
};

describe("HardpointBreakdown", () => {
  it("shows the laser, its modules and the combined stats", () => {
    renderWithIntl(
      <HardpointBreakdown
        index={1}
        laser={laser}
        modules={[surge]}
        stats={aggregateHardpointStats(laser, [surge])}
      />,
      { locale: "en" },
    );

    expect(screen.getByText("Helix II")).toBeVisible();
    expect(screen.getByText("Surge")).toBeVisible();
    expect(screen.getByText(/active/)).toBeVisible();
    expect(screen.getByText("6000")).toBeVisible();
    expect(screen.getByText("×0.70")).toBeVisible();
  });

  it("hides neutral factors and null power values", () => {
    const s0: MiningLaser = {
      ...laser,
      code: "arbor-mhv",
      name: "Arbor MHV",
      size: 0,
      stats: {
        laserPower: null,
        extractionLaserPower: null,
        optimalRange: 5,
        maxRange: 15,
      },
      modifiers: {},
    };
    renderWithIntl(
      <HardpointBreakdown
        index={1}
        laser={s0}
        modules={[]}
        stats={aggregateHardpointStats(s0, [])}
      />,
      { locale: "en" },
    );

    expect(screen.queryByText("Laser power")).toBeNull();
    expect(screen.queryByText("Resistance")).toBeNull();
    expect(screen.getByText("No modules fitted")).toBeVisible();
    expect(screen.getByText(/power values are not comparable/)).toBeVisible();
  });
});
