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

  it("shows a crafted badge with the signed bonus", () => {
    renderWithIntl(
      <HardpointBreakdown
        index={1}
        laser={laser}
        modules={[]}
        stats={aggregateHardpointStats(laser, [], 29)}
        craftedBonusPct={29}
      />,
      { locale: "en" },
    );

    expect(screen.getByText(/Crafted \(\+29\s?%\)/)).toBeVisible();
    // 4000 × 1.29
    expect(screen.getByText("5160")).toBeVisible();
  });

  it("shows the sign for a negative crafted bonus", () => {
    renderWithIntl(
      <HardpointBreakdown
        index={1}
        laser={laser}
        modules={[]}
        stats={aggregateHardpointStats(laser, [], -25)}
        craftedBonusPct={-25}
      />,
      { locale: "en" },
    );

    expect(screen.getByText(/Crafted \(-25\s?%\)/)).toBeVisible();
  });

  it("shows no crafted badge without a bonus", () => {
    renderWithIntl(
      <HardpointBreakdown
        index={1}
        laser={laser}
        modules={[]}
        stats={aggregateHardpointStats(laser, [])}
      />,
      { locale: "en" },
    );

    expect(screen.queryByText(/Crafted/)).toBeNull();
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
