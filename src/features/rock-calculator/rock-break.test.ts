import { describe, expect, it } from "vitest";
import type {
  MiningGadget,
  MiningLaser,
  MiningModule,
} from "@/features/loadouts/equipment.schema";
import type { Loadout } from "@/features/loadouts/loadouts.schema";
import type { Ore } from "@/features/ores/ores.schema";
import {
  additiveModuleStack,
  bestCaseBreakableMass,
  bestGadget,
  checkLoadout,
  headStats,
  headsNeeded,
  MAX_GLOBAL_MODULES,
  MAX_HEADS,
  maxBreakableMass,
  oreBreakabilityRows,
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

function okunis(): MiningGadget {
  return {
    code: "okunis",
    name: "OkuNis",
    manufacturer: "Shubin Interstellar",
    modifiers: { instability: 0.7, optimalChargeWindow: 1.7 },
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
  it("scales the rock resistance by the modifiers, not the power directly", () => {
    // effRes = 0.30 × 0.7 = 0.21 → 30000 × 0.2 / (1 − 0.21) = 7594.94
    expect(
      requiredPower({
        mass: 30000,
        resistancePct: 30,
        headResistanceModifiers: [0.7],
      }),
    ).toBeCloseTo(7594.94, 1);
  });

  it("is unaffected by modifiers at 0 % rock resistance", () => {
    // effRes = 0 × x = 0 → Modifikatoren wirkungslos
    expect(
      requiredPower({
        mass: 30000,
        resistancePct: 0,
        headResistanceModifiers: [0.7, 0.7, 0.7],
      }),
    ).toBeCloseTo(6000);
  });

  it("applies the gadget modifier ONCE, not per head", () => {
    // effRes = 0.20 × 1.25² × 0.5 = 0.15625 → 2000 / 0.84375 = 2370.37
    expect(
      requiredPower({
        mass: 10000,
        resistancePct: 20,
        headResistanceModifiers: [1.25, 1.25],
        gadgetResistanceModifier: 0.5,
      }),
    ).toBeCloseTo(2370.37, 1);
  });

  it("returns Infinity when the effective resistance reaches 100 %", () => {
    // 0.95 × 1.25 = 1.1875 → clamp auf 1 → unknackbar
    expect(
      requiredPower({
        mass: 1000,
        resistancePct: 95,
        headResistanceModifiers: [1.25],
      }),
    ).toBe(Infinity);
  });

  it("clamps negative effective resistance to 0", () => {
    // Erz-Resistenzen können negativ sein (z. B. Kupfer −70 %)
    expect(
      requiredPower({
        mass: 1000,
        resistancePct: -70,
        headResistanceModifiers: [0.7],
      }),
    ).toBeCloseTo(200);
  });
});

describe("headsNeeded", () => {
  const rock = { mass: 30000, resistancePct: 30, modules: [], gadget: null };

  it("finds the minimal head count for a bare laser", () => {
    // Helix II: required(1) = 6000/0.79 = 7594.94 > 4080;
    // required(2) = 6000/0.853 = 7034.00 ≤ 8160
    const result = headsNeeded(laser(), rock);
    expect(result.canBreak).toBe(true);
    expect(result.heads).toBe(2);
    expect(result.requiredAtHeads).toBeCloseTo(7034.0, 1);
    expect(result.availableAtHeads).toBeCloseTo(8160);
  });

  it("lets modules reduce the head count", () => {
    // Helix II + 2× Surge: Power 8160, headRes 0.49 →
    // required(1) = 6000/0.853 = 7034.00 ≤ 8160
    const result = headsNeeded(laser(), {
      ...rock,
      modules: [surge(), surge()],
    });
    expect(result.canBreak).toBe(true);
    expect(result.heads).toBe(1);
  });

  it("lets a gadget flip an unbreakable rock to breakable", () => {
    const smallRock = {
      mass: 8000,
      resistancePct: 20,
      modules: [],
      gadget: null,
    };
    // Arbor MH1: required(1) = 1600/0.75 = 2133.33 > 1890
    expect(headsNeeded(arborMh1(), smallRock).heads).not.toBe(1);
    // Mit Sabir (0.5): effRes 0.125 → required(1) = 1828.57 ≤ 1890
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
    // Arbor MH1: required(1) = 2000/0.75 = 2666.67 > 1890
    expect(headsNeeded(arborMh1(), smallRock).heads).not.toBe(1);
    // Mit +60 % Craft-Bonus: 1890 × 1.6 = 3024 ≥ 2666.67
    const boosted = headsNeeded(arborMh1(), {
      ...smallRock,
      laserPowerBonusPct: 60,
    });
    expect(boosted.canBreak).toBe(true);
    expect(boosted.heads).toBe(1);
  });

  it("caps at MAX_HEADS and reports unbreakable rocks", () => {
    // Arbor MH1, 100000/50 %: effRes(3) = 0.5 × 1.25³ = 0.9766 →
    // required(3) = 20000/0.0234375 = 853333.33 > 3×1890
    const result = headsNeeded(arborMh1(), {
      mass: 100000,
      resistancePct: 50,
      modules: [],
      gadget: null,
    });
    expect(result.canBreak).toBe(false);
    expect(result.heads).toBeNull();
    expect(result.requiredAtHeads).toBeCloseTo(853333.33, 1);
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
    // MOLE 3× Helix II: effRes = 0.3 × 0.343 = 0.1029 →
    // required = 6000/0.8971 = 6688.22 ≤ 12240
    const result = checkLoadout(loadout(), catalog(), rock);
    expect(result.shipMining).toBe(true);
    expect(result.canBreak).toBe(true);
    expect(result.required).toBeCloseTo(6688.22, 1);
    expect(result.available).toBeCloseTo(12240);
  });

  it("applies per-hardpoint modules from the loadout", () => {
    // 1× Helix II + 2× Surge: Power 8160, headRes 0.49 →
    // required = 6000/0.853 = 7034.00
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
    expect(result.required).toBeCloseTo(7034.0, 1);
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

  it("applies stored crafted bonuses per hardpoint", () => {
    // 1 von 3 Köpfen gecraftet (+50 %): 4080 + 4080 + 6120 = 14280;
    // required bleibt 6688.22 (Bonus ändert die Resistenz nicht)
    const crafted = loadout({
      hardpoints: [
        {
          hardpointIndex: 0,
          laserCode: "helix-ii",
          moduleCodes: [],
          craftedBonusPct: 50,
        },
        { hardpointIndex: 1, laserCode: "helix-ii", moduleCodes: [] },
        { hardpointIndex: 2, laserCode: "helix-ii", moduleCodes: [] },
      ],
    });
    const result = checkLoadout(crafted, catalog(), rock);
    expect(result.available).toBeCloseTo(14280);
    expect(result.required).toBeCloseTo(6688.22, 1);
  });

  it("clamps stored out-of-range bonuses (legacy/foreign data)", () => {
    const outOfRange = (craftedBonusPct: number) =>
      checkLoadout(
        loadout({
          hardpoints: [
            {
              hardpointIndex: 0,
              laserCode: "helix-ii",
              moduleCodes: [],
              craftedBonusPct,
            },
          ],
        }),
        catalog(),
        rock,
      );
    expect(outOfRange(150).available).toBeCloseTo(8160); // wie +100 %
    expect(outOfRange(-80).available).toBeCloseTo(2040); // wie −50 %
  });

  it("lets a stored crafted bonus flip the verdict to breakable", () => {
    const single = (craftedBonusPct?: number) =>
      loadout({
        hardpoints: [
          {
            hardpointIndex: 0,
            laserCode: "helix-ii",
            moduleCodes: [],
            ...(craftedBonusPct === undefined ? {} : { craftedBonusPct }),
          },
        ],
      });
    // required(1 Kopf) = 6000/0.79 = 7594.94 > 4080 — ohne Bonus unknackbar
    expect(checkLoadout(single(), catalog(), rock).canBreak).toBe(false);
    // +90 %: 7752 ≥ 7594.94
    expect(checkLoadout(single(90), catalog(), rock).canBreak).toBe(true);
  });
});

describe("bestGadget", () => {
  it("picks the gadget with the strongest resistance reduction", () => {
    expect(bestGadget([okunis(), sabir()])?.code).toBe("sabir");
  });

  it("returns null without gadgets or without a resistance effect", () => {
    expect(bestGadget([])).toBeNull();
    expect(bestGadget([okunis()])).toBeNull();
    const counterproductive: MiningGadget = {
      ...okunis(),
      code: "worse",
      modifiers: { resistance: 1.2 },
    };
    expect(bestGadget([counterproductive])).toBeNull();
  });
});

describe("maxBreakableMass", () => {
  const noRock = { resistancePct: 0, gadget: null };

  it("inverts the break inequality for a full loadout", () => {
    // 3× Helix II bei 0 %: effRes = 0 → 12240 × 1 / 0.2 = 61200
    const maxMass = maxBreakableMass(loadout(), catalog(), noRock);
    expect(maxMass).toBeCloseTo(61200);
  });

  it("is consistent with checkLoadout at the boundary", () => {
    const maxMass = maxBreakableMass(loadout(), catalog(), noRock);
    expect(maxMass).not.toBeNull();
    const at = (mass: number) =>
      checkLoadout(loadout(), catalog(), {
        mass,
        resistancePct: 0,
        gadget: null,
      }).canBreak;
    // exakt an der Grenze ist Gleitkomma-sensitiv → minimal darunter/darüber
    expect(at((maxMass ?? 0) * (1 - 1e-9))).toBe(true);
    expect(at((maxMass ?? 0) * 1.01)).toBe(false);
  });

  it("scales down with rock resistance", () => {
    // effRes(50 %) = 0.5 × 0.343 = 0.1715 → Faktor 0.8285
    const atZero = maxBreakableMass(loadout(), catalog(), noRock);
    const atFifty = maxBreakableMass(loadout(), catalog(), {
      resistancePct: 50,
      gadget: null,
    });
    expect(atFifty).toBeCloseTo((atZero ?? 0) * 0.8285, 5);
  });

  it("lets a gadget soften the rock resistance, but not below 0 %", () => {
    // Bei 50 %: effRes mit Sabir = 0.5 × 0.343 × 0.5 = 0.08575
    const withGadget = maxBreakableMass(loadout(), catalog(), {
      resistancePct: 50,
      gadget: sabir(),
    });
    const without = maxBreakableMass(loadout(), catalog(), {
      resistancePct: 50,
      gadget: null,
    });
    expect(withGadget).toBeCloseTo(((without ?? 0) * 0.91425) / 0.8285, 5);
    // Bei 0 % gibt es nichts zu senken — Gadget wirkungslos
    expect(
      maxBreakableMass(loadout(), catalog(), {
        resistancePct: 0,
        gadget: sabir(),
      }),
    ).toBeCloseTo(61200);
  });

  it("returns 0 when the effective resistance reaches 100 %", () => {
    // Arbor-Katalog: headRes 1.25, Erz 95 % → effRes 1.1875 → clamp 1
    const arborCatalog = {
      lasersByCode: new Map([["arbor-mh1", arborMh1()]]),
      modulesByCode: new Map<string, MiningModule>(),
    };
    const arborLoadout = loadout({
      hardpoints: [
        { hardpointIndex: 0, laserCode: "arbor-mh1", moduleCodes: [] },
      ],
    });
    expect(
      maxBreakableMass(arborLoadout, arborCatalog, {
        resistancePct: 95,
        gadget: null,
      }),
    ).toBe(0);
  });

  it("grows proportionally with stored crafted bonuses", () => {
    const crafted = loadout({
      hardpoints: [
        {
          hardpointIndex: 0,
          laserCode: "helix-ii",
          moduleCodes: [],
          craftedBonusPct: 50,
        },
        { hardpointIndex: 1, laserCode: "helix-ii", moduleCodes: [] },
        { hardpointIndex: 2, laserCode: "helix-ii", moduleCodes: [] },
      ],
    });
    const boosted = maxBreakableMass(crafted, catalog(), noRock);
    const base = maxBreakableMass(loadout(), catalog(), noRock);
    expect(boosted).toBeCloseTo(((base ?? 0) * 14280) / 12240, 5);
  });

  it("returns null for non-ship loadouts and loadouts without comparable heads", () => {
    expect(
      maxBreakableMass(
        loadout({ method: "roc", vehicleCode: "roc" }),
        catalog(),
        noRock,
      ),
    ).toBeNull();
    expect(
      maxBreakableMass(
        loadout({
          hardpoints: [
            { hardpointIndex: 0, laserCode: "unknown-laser", moduleCodes: [] },
          ],
        }),
        catalog(),
        noRock,
      ),
    ).toBeNull();
  });
});

describe("bestCaseBreakableMass", () => {
  it("equals maxBreakableMass at 0 % resistance", () => {
    // Bei 0 % wirken weder Widerstands-Modifikatoren noch Gadgets
    expect(bestCaseBreakableMass(loadout(), catalog())).toBeCloseTo(61200);
    expect(
      bestCaseBreakableMass(
        loadout({ method: "roc", vehicleCode: "roc" }),
        catalog(),
      ),
    ).toBeNull();
  });
});

describe("oreBreakabilityRows", () => {
  function ore(overrides: Partial<Ore> = {}): Ore {
    return {
      code: "QUAN",
      name_de: "Quantanium",
      name_en: "Quantanium",
      rarityTier: "legendary",
      mineableBy: { ship: true, roc: false, fps: false },
      resistance: 0.9,
      ...overrides,
    };
  }

  const ores: Ore[] = [
    ore(),
    ore({
      code: "COPP",
      name_de: "Kupfer",
      name_en: "Copper",
      rarityTier: "common",
      resistance: -0.7,
    }),
    ore({
      code: "GOLD",
      name_de: "Gold",
      name_en: "Gold",
      rarityTier: "uncommon",
      resistance: 0.25,
    }),
    // nicht ship-minebar → fliegt raus
    ore({
      code: "JANA",
      name_en: "Janalite",
      mineableBy: { ship: false, roc: false, fps: true },
      resistance: 0.1,
    }),
    // keine Resistenz-Daten → fliegt raus
    ore({ code: "ICEW", name_en: "Ice", resistance: undefined }),
  ];

  it("maps ship-mineable ores to max mass, hardest first", () => {
    const rows = oreBreakabilityRows(ores, loadout(), catalog(), null);

    expect(rows.map((row) => row.oreCode)).toEqual(["QUAN", "GOLD", "COPP"]);
    const base = 61200; // 3× Helix II bei 0 % Resistenz
    expect(rows[0]).toMatchObject({ oreName: "Quantanium", resistancePct: 90 });
    // effRes = 0.9 × 0.343 = 0.3087
    expect(rows[0]?.maxMass).toBeCloseTo(base * (1 - 0.3087), 1);
    // effRes = 0.25 × 0.343 = 0.08575
    expect(rows[1]?.maxMass).toBeCloseTo(base * (1 - 0.08575), 1);
    // negative Erz-Resistenz (Kupfer) clampt auf 0 % — wie ein neutraler Stein
    expect(rows[2]?.maxMass).toBeCloseTo(base, 1);
  });

  it("applies the gadget to every ore row", () => {
    const withGadget = oreBreakabilityRows(ores, loadout(), catalog(), sabir());
    const without = oreBreakabilityRows(ores, loadout(), catalog(), null);
    // QUAN: effRes mit Sabir = 0.9 × 0.343 × 0.5 = 0.15435
    expect(withGadget[0]?.maxMass).toBeCloseTo(
      ((without[0]?.maxMass ?? 0) * (1 - 0.15435)) / (1 - 0.3087),
      5,
    );
  });

  it("returns no rows for loadouts without comparable heads", () => {
    expect(
      oreBreakabilityRows(
        ores,
        loadout({ method: "roc", vehicleCode: "roc" }),
        catalog(),
        null,
      ),
    ).toEqual([]);
  });
});
