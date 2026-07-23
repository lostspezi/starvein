import { describe, expect, it } from "vitest";
import type {
  MiningGadget,
  MiningLaser,
  MiningModule,
} from "@/features/loadouts/equipment.schema";
import type { Loadout } from "@/features/loadouts/loadouts.schema";
import {
  additiveModuleStack,
  checkLoadout,
  headStats,
  headsNeeded,
  MAX_GLOBAL_MODULES,
  MAX_HEADS,
  requiredPower,
  ROCK_BREAK_MASS_FACTOR,
} from "./rock-break";

const patchVersion = "4.7";

function laser(overrides: Partial<MiningLaser> = {}): MiningLaser {
  return {
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
    ...overrides,
  };
}

function arborMh1(): MiningLaser {
  return laser({
    code: "arbor-mh1",
    name: "Arbor MH1",
    size: 1,
    moduleSlots: 1,
    stats: {
      laserPower: 1890,
      extractionLaserPower: 1850,
      optimalRange: 60,
      maxRange: 180,
    },
    modifiers: { resistance: 1.25 },
  });
}

function surge(): MiningModule {
  return {
    code: "surge",
    name: "Surge",
    manufacturer: "Thermyte Concern",
    type: "active",
    charges: 7,
    durationSeconds: 15,
    modifiers: { laserPower: 1.5, instability: 1.1, resistance: 0.85 },
    patchVersion,
  };
}

function sabir(): MiningGadget {
  return {
    code: "sabir",
    name: "Sabir",
    manufacturer: "Shubin Interstellar",
    modifiers: { instability: 1.15, resistance: 0.5, optimalChargeWindow: 1.5 },
    patchVersion,
  };
}

function loadout(overrides: Partial<Loadout> = {}): Loadout {
  return {
    id: "loadout-1",
    name: "Break-MOLE",
    method: "ship",
    vehicleCode: "mole",
    hardpoints: [
      { hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: [] },
      { hardpointIndex: 1, laserCode: "helix-ii", moduleCodes: [] },
      { hardpointIndex: 2, laserCode: "helix-ii", moduleCodes: [] },
    ],
    gadgetCodes: [],
    ownerUserId: "user-1",
    isPublic: false,
    votes: { up: 0 },
    voters: [],
    patchVersion,
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z",
    ...overrides,
  };
}

function catalog() {
  return {
    lasersByCode: new Map([["helix-ii", laser()]]),
    modulesByCode: new Map([["surge", surge()]]),
  };
}

describe("constants", () => {
  it("exposes the patch-tunable mass factor and UI caps", () => {
    expect(ROCK_BREAK_MASS_FACTOR).toBe(0.2);
    expect(MAX_HEADS).toBe(3);
    expect(MAX_GLOBAL_MODULES).toBe(3);
  });
});

describe("additiveModuleStack", () => {
  it("stacks module modifiers additively (Regolith 4.0.1 convention)", () => {
    // 2× Surge laserPower 1.5: 1 + 0.5 + 0.5 = 2.0 — NOT 1.5² = 2.25
    expect(additiveModuleStack("laserPower", [surge(), surge()])).toBeCloseTo(
      2.0,
    );
    expect(additiveModuleStack("resistance", [surge(), surge()])).toBeCloseTo(
      0.7,
    );
  });

  it("returns the neutral factor without modules or modifier", () => {
    expect(additiveModuleStack("laserPower", [])).toBe(1);
    expect(additiveModuleStack("clusterModifier", [surge()])).toBe(1);
  });
});

describe("headStats", () => {
  it("scales laser power and resistance by the module stack", () => {
    const stats = headStats(laser(), [surge(), surge()]);
    expect(stats?.power).toBeCloseTo(8160);
    expect(stats?.resistanceModifier).toBeCloseTo(0.49);
  });

  it("truncates module picks to the laser's module slots", () => {
    const kleinS1 = laser({
      code: "klein-s1",
      name: "Klein-S1",
      size: 1,
      moduleSlots: 0,
      stats: {
        laserPower: 2220,
        extractionLaserPower: 2220,
        optimalRange: 45,
        maxRange: 135,
      },
      modifiers: { resistance: 0.55 },
    });
    const stats = headStats(kleinS1, [surge(), surge()]);
    expect(stats?.power).toBe(2220);
    expect(stats?.resistanceModifier).toBe(0.55);
  });

  it("scales the laser's base power by a crafted-laser bonus before modules", () => {
    // +29 % auf 4080 = 5263.2; Resistenz bleibt unberührt
    const bare = headStats(laser(), [], 29);
    expect(bare?.power).toBeCloseTo(5263.2);
    expect(bare?.resistanceModifier).toBeCloseTo(0.7);
    // Bonus wirkt auf die Basis, der Modul-Stack danach: 4080 × 1.5 × 2.0
    const modded = headStats(laser(), [surge(), surge()], 50);
    expect(modded?.power).toBeCloseTo(12240);
  });

  it("accepts a negative crafted-laser bonus", () => {
    expect(headStats(laser(), [], -50)?.power).toBeCloseTo(2040);
  });

  it("returns null for size-0 lasers without comparable power", () => {
    const rocLaser = laser({
      size: 0,
      moduleSlots: 0,
      stats: {
        laserPower: null,
        extractionLaserPower: null,
        optimalRange: 5,
        maxRange: 15,
      },
      modifiers: {},
    });
    expect(headStats(rocLaser, [])).toBeNull();
  });
});

describe("requiredPower", () => {
  it("scales with mass, resistance and per-head resistance modifiers", () => {
    // 30000 × 0.2 × 1.3 × 0.7 = 5460
    expect(
      requiredPower({
        mass: 30000,
        resistancePct: 30,
        headResistanceModifiers: [0.7],
      }),
    ).toBeCloseTo(5460);
  });

  it("applies the gadget modifier ONCE, not per head", () => {
    // 10000 × 0.2 × 1.2 × 1.25² × 0.5 = 1875 (per-head würde ×0.25 = 937.5 ergeben)
    expect(
      requiredPower({
        mass: 10000,
        resistancePct: 20,
        headResistanceModifiers: [1.25, 1.25],
        gadgetResistanceModifier: 0.5,
      }),
    ).toBeCloseTo(1875);
  });
});

describe("headsNeeded", () => {
  const rock = { mass: 30000, resistancePct: 30, modules: [], gadget: null };

  it("finds the minimal head count for a bare laser", () => {
    // Helix II: required(1) = 5460 > 4080; required(2) = 3822 ≤ 8160
    const result = headsNeeded(laser(), rock);
    expect(result.canBreak).toBe(true);
    expect(result.heads).toBe(2);
    expect(result.requiredAtHeads).toBeCloseTo(3822);
    expect(result.availableAtHeads).toBeCloseTo(8160);
  });

  it("lets modules reduce the head count", () => {
    // Helix II + 2× Surge: Power 8160, headRes 0.49 → required(1) = 3822 ≤ 8160
    const result = headsNeeded(laser(), {
      ...rock,
      modules: [surge(), surge()],
    });
    expect(result.canBreak).toBe(true);
    expect(result.heads).toBe(1);
  });

  it("lets a gadget flip an unbreakable rock to breakable", () => {
    const smallRock = {
      mass: 10000,
      resistancePct: 20,
      modules: [],
      gadget: null,
    };
    // Arbor MH1: required(1) = 3000 > 1890
    expect(headsNeeded(arborMh1(), smallRock).heads).not.toBe(1);
    // Mit Sabir (0.5): required(1) = 1500 ≤ 1890
    const withGadget = headsNeeded(arborMh1(), {
      ...smallRock,
      gadget: sabir(),
    });
    expect(withGadget.canBreak).toBe(true);
    expect(withGadget.heads).toBe(1);
  });

  it("lets a crafted-laser bonus flip an unbreakable rock to breakable", () => {
    const smallRock = {
      mass: 10000,
      resistancePct: 20,
      modules: [],
      gadget: null,
    };
    // Arbor MH1: required(1) = 3000 > 1890
    expect(headsNeeded(arborMh1(), smallRock).heads).not.toBe(1);
    // Mit +60 % Craft-Bonus: 1890 × 1.6 = 3024 ≥ 3000
    const boosted = headsNeeded(arborMh1(), {
      ...smallRock,
      laserPowerBonusPct: 60,
    });
    expect(boosted.canBreak).toBe(true);
    expect(boosted.heads).toBe(1);
  });

  it("caps at MAX_HEADS and reports unbreakable rocks", () => {
    // Arbor MH1, Masse 100000, Res 50 %: required(3) = 58593.75 > 3×1890
    const result = headsNeeded(arborMh1(), {
      mass: 100000,
      resistancePct: 50,
      modules: [],
      gadget: null,
    });
    expect(result.canBreak).toBe(false);
    expect(result.heads).toBeNull();
    expect(result.requiredAtHeads).toBeCloseTo(58593.75);
    expect(result.availableAtHeads).toBeCloseTo(5670);
  });

  it("returns unbreakable for size-0 lasers", () => {
    const rocLaser = laser({
      size: 0,
      stats: {
        laserPower: null,
        extractionLaserPower: null,
        optimalRange: 5,
        maxRange: 15,
      },
    });
    const result = headsNeeded(rocLaser, rock);
    expect(result.canBreak).toBe(false);
    expect(result.heads).toBeNull();
  });
});

describe("checkLoadout", () => {
  const rock = { mass: 30000, resistancePct: 30, gadget: null };

  it("sums power and multiplies resistance across equipped hardpoints", () => {
    // MOLE 3× Helix II: required = 30000×0.2×1.3×0.7³ = 2675.4 ≤ 12240
    const result = checkLoadout(loadout(), catalog(), rock);
    expect(result.shipMining).toBe(true);
    expect(result.canBreak).toBe(true);
    expect(result.required).toBeCloseTo(2675.4);
    expect(result.available).toBeCloseTo(12240);
  });

  it("applies per-hardpoint modules from the loadout", () => {
    // 1× Helix II + 2× Surge: Power 8160, headRes 0.49 → required 3822
    const single = loadout({
      hardpoints: [
        {
          hardpointIndex: 0,
          laserCode: "helix-ii",
          moduleCodes: ["surge", "surge"],
        },
      ],
    });
    const result = checkLoadout(single, catalog(), rock);
    expect(result.canBreak).toBe(true);
    expect(result.required).toBeCloseTo(3822);
    expect(result.available).toBeCloseTo(8160);
  });

  it("marks non-ship loadouts instead of computing a verdict", () => {
    const rocLoadout = loadout({ method: "roc", vehicleCode: "roc" });
    const result = checkLoadout(rocLoadout, catalog(), rock);
    expect(result.shipMining).toBe(false);
    expect(result.canBreak).toBe(false);
  });

  it("ignores hardpoints whose laser is unknown or has no comparable power", () => {
    const mixed = loadout({
      hardpoints: [
        { hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: [] },
        { hardpointIndex: 1, laserCode: "unknown-laser", moduleCodes: [] },
      ],
    });
    const result = checkLoadout(mixed, catalog(), rock);
    // Nur der bekannte Kopf zählt: required(1) = 5460 > 4080
    expect(result.available).toBeCloseTo(4080);
    expect(result.canBreak).toBe(false);
  });
});
