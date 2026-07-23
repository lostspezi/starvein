import { describe, expect, it } from "vitest";
import type { MiningLaser, MiningModule } from "./equipment.schema";
import {
  aggregateHardpointStats,
  aggregateLoadoutStats,
} from "./loadout-stats";

const patchVersion = "4.7";

function laser(overrides: Partial<MiningLaser> = {}): MiningLaser {
  return {
    code: "helix-ii",
    name: "Helix II",
    manufacturer: "Thermyte Concern",
    size: 2,
    moduleSlots: 3,
    stats: {
      laserPower: 4000,
      extractionLaserPower: 800,
      optimalRange: 40,
      maxRange: 80,
    },
    modifiers: {},
    patchVersion,
    ...overrides,
  };
}

function module_(overrides: Partial<MiningModule> = {}): MiningModule {
  return {
    code: "rieger-c3",
    name: "Rieger-C3",
    manufacturer: "MISC",
    type: "passive",
    charges: null,
    durationSeconds: null,
    modifiers: {},
    patchVersion,
    ...overrides,
  };
}

describe("aggregateHardpointStats", () => {
  it("returns laser base stats and laser modifiers without modules", () => {
    const stats = aggregateHardpointStats(
      laser({ modifiers: { resistance: 0.7 } }),
      [],
    );
    expect(stats.laserPower).toBe(4000);
    expect(stats.extractionLaserPower).toBe(800);
    expect(stats.optimalRange).toBe(40);
    expect(stats.resistance).toBe(0.7);
    expect(stats.instability).toBe(1);
  });

  it("defaults every missing modifier to the neutral factor 1", () => {
    const stats = aggregateHardpointStats(laser(), []);
    expect(stats.resistance).toBe(1);
    expect(stats.optimalChargeWindow).toBe(1);
    expect(stats.clusterModifier).toBe(1);
  });

  it("multiplies laser power by module factors", () => {
    const stats = aggregateHardpointStats(laser(), [
      module_({ modifiers: { laserPower: 1.25 } }),
    ]);
    expect(stats.laserPower).toBe(5000);
  });

  it("stacks module modifiers multiplicatively", () => {
    const stats = aggregateHardpointStats(
      laser({ modifiers: { resistance: 0.8 } }),
      [
        module_({ modifiers: { resistance: 0.5 } }),
        module_({ code: "torpid", modifiers: { resistance: 0.5 } }),
      ],
    );
    expect(stats.resistance).toBeCloseTo(0.2);
  });

  it("combines laser and module factors for power stats", () => {
    const stats = aggregateHardpointStats(
      laser({ modifiers: { laserPower: 1.1 } }),
      [module_({ modifiers: { laserPower: 1.2 } })],
    );
    expect(stats.laserPower).toBeCloseTo(4000 * 1.1 * 1.2);
  });

  it("scales the laser power base by a crafted bonus before the factors", () => {
    const stats = aggregateHardpointStats(
      laser({ modifiers: { laserPower: 1.1 } }),
      [module_({ modifiers: { laserPower: 1.2 } })],
      29,
    );
    expect(stats.laserPower).toBeCloseTo(4000 * 1.29 * 1.1 * 1.2);
    // Extraktionsleistung ist vom Craft-Bonus unberührt
    expect(stats.extractionLaserPower).toBe(800);
  });

  it("keeps power null for size-0 lasers even with a crafted bonus", () => {
    const stats = aggregateHardpointStats(
      laser({
        size: 0,
        stats: {
          laserPower: null,
          extractionLaserPower: null,
          optimalRange: 5,
          maxRange: 15,
        },
      }),
      [],
      50,
    );
    expect(stats.laserPower).toBeNull();
  });

  it("keeps power null for size-0 vehicle lasers", () => {
    const stats = aggregateHardpointStats(
      laser({
        size: 0,
        stats: {
          laserPower: null,
          extractionLaserPower: null,
          optimalRange: 5,
          maxRange: 15,
        },
      }),
      [module_({ modifiers: { laserPower: 1.2 } })],
    );
    expect(stats.laserPower).toBeNull();
    expect(stats.extractionLaserPower).toBeNull();
    expect(stats.optimalRange).toBe(5);
  });
});

describe("aggregateLoadoutStats", () => {
  it("sums power values and takes min/max of ranges across hardpoints", () => {
    const a = aggregateHardpointStats(laser(), []);
    const b = aggregateHardpointStats(
      laser({
        code: "arbor-mh2",
        stats: {
          laserPower: 2000,
          extractionLaserPower: 600,
          optimalRange: 30,
          maxRange: 100,
        },
      }),
      [],
    );
    const total = aggregateLoadoutStats([a, b]);
    expect(total.totalLaserPower).toBe(6000);
    expect(total.totalExtractionLaserPower).toBe(1400);
    expect(total.minOptimalRange).toBe(30);
    expect(total.maxRange).toBe(100);
  });

  it("ignores null power values in the totals", () => {
    const withPower = aggregateHardpointStats(laser(), []);
    const noPower = aggregateHardpointStats(
      laser({
        size: 0,
        stats: {
          laserPower: null,
          extractionLaserPower: null,
          optimalRange: 5,
          maxRange: 15,
        },
      }),
      [],
    );
    const total = aggregateLoadoutStats([withPower, noPower]);
    expect(total.totalLaserPower).toBe(4000);
    expect(total.minOptimalRange).toBe(5);
  });

  it("handles a single hardpoint", () => {
    const only = aggregateHardpointStats(laser(), []);
    const total = aggregateLoadoutStats([only]);
    expect(total.totalLaserPower).toBe(4000);
    expect(total.minOptimalRange).toBe(40);
  });
});
