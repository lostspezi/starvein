import { describe, expect, it } from "vitest";
import {
  LOADOUT_METHODS,
  miningGadgetSchema,
  miningLaserSchema,
  miningModuleSchema,
  miningVehicleSchema,
  MODIFIER_KEYS,
  MODULE_TYPES,
} from "./equipment.schema";

const prospector = {
  code: "prospector",
  name: "Prospector",
  manufacturer: "MISC",
  method: "ship",
  hardpoints: [{ size: 1 }],
  gadgetCapable: true,
  patchVersion: "4.7",
};

const roc = {
  code: "greycat-roc",
  name: "ROC",
  manufacturer: "Greycat Industrial",
  method: "roc",
  hardpoints: [{ size: 0 }],
  gadgetCapable: true,
  stockLaserCode: "arbor-mhv",
  patchVersion: "4.7",
};

const helixI = {
  code: "helix-i",
  name: "Helix I",
  manufacturer: "Thermyte Concern",
  size: 1,
  moduleSlots: 2,
  stats: {
    laserPower: 3150,
    extractionLaserPower: 1850,
    optimalRange: 15,
    maxRange: 45,
  },
  modifiers: { resistance: 0.7, instability: 1.1 },
  patchVersion: "4.7",
};

const arborMhv = {
  code: "arbor-mhv",
  name: "Arbor MHV",
  manufacturer: "Greycat Industrial",
  size: 0,
  moduleSlots: 2,
  stats: {
    laserPower: null,
    extractionLaserPower: null,
    optimalRange: 5,
    maxRange: 15,
  },
  modifiers: { instability: 0.6 },
  patchVersion: "4.7",
};

const riegerC3 = {
  code: "rieger-c3",
  name: "Rieger-C3",
  manufacturer: "Musashi Industrial & Starflight Concern",
  type: "passive",
  charges: null,
  durationSeconds: null,
  modifiers: { laserPower: 1.32 },
  patchVersion: "4.7",
};

const surge = {
  code: "surge",
  name: "Surge",
  manufacturer: "Thermyte Concern",
  type: "active",
  charges: 5,
  durationSeconds: 10,
  modifiers: { optimalChargeRate: 1.5 },
  patchVersion: "4.7",
};

const optimax = {
  code: "optimax",
  name: "OptiMax",
  manufacturer: "Shubin Interstellar",
  modifiers: { optimalChargeWindow: 1.3, inertMaterials: 0.85 },
  patchVersion: "4.7",
};

describe("miningVehicleSchema", () => {
  it("accepts a ship vehicle with hardpoints", () => {
    expect(miningVehicleSchema.parse(prospector)).toEqual(prospector);
  });

  it("accepts a ground vehicle with a size-0 hardpoint and stock laser", () => {
    expect(miningVehicleSchema.parse(roc)).toEqual(roc);
  });

  it("rejects the fps method — loadouts cover only ship and roc", () => {
    expect(
      miningVehicleSchema.safeParse({ ...roc, method: "fps" }).success,
    ).toBe(false);
  });

  it("accepts an optional uexId", () => {
    const parsed = miningVehicleSchema.parse({ ...prospector, uexId: 42 });
    expect(parsed.uexId).toBe(42);
  });

  it("rejects unknown mining methods", () => {
    expect(
      miningVehicleSchema.safeParse({ ...prospector, method: "hover" }).success,
    ).toBe(false);
  });

  it("rejects hardpoint sizes outside 0-2", () => {
    expect(
      miningVehicleSchema.safeParse({
        ...prospector,
        hardpoints: [{ size: 3 }],
      }).success,
    ).toBe(false);
    expect(
      miningVehicleSchema.safeParse({
        ...prospector,
        hardpoints: [{ size: -1 }],
      }).success,
    ).toBe(false);
  });

  it("rejects non-kebab-case codes", () => {
    expect(
      miningVehicleSchema.safeParse({ ...prospector, code: "Prospector" })
        .success,
    ).toBe(false);
  });
});

describe("miningLaserSchema", () => {
  it("accepts a laser with stats and modifiers", () => {
    expect(miningLaserSchema.parse(helixI)).toEqual(helixI);
  });

  it("accepts a laser without modifiers", () => {
    const parsed = miningLaserSchema.parse({ ...helixI, modifiers: {} });
    expect(parsed.modifiers).toEqual({});
  });

  it("accepts a size-0 vehicle laser with null power values", () => {
    expect(miningLaserSchema.parse(arborMhv)).toEqual(arborMhv);
  });

  it("rejects sizes outside 0-2", () => {
    expect(miningLaserSchema.safeParse({ ...helixI, size: 3 }).success).toBe(
      false,
    );
  });

  it("rejects more than 3 module slots", () => {
    expect(
      miningLaserSchema.safeParse({ ...helixI, moduleSlots: 4 }).success,
    ).toBe(false);
  });

  it("rejects non-positive stats", () => {
    expect(
      miningLaserSchema.safeParse({
        ...helixI,
        stats: { ...helixI.stats, laserPower: 0 },
      }).success,
    ).toBe(false);
    expect(
      miningLaserSchema.safeParse({
        ...helixI,
        stats: { ...helixI.stats, optimalRange: 0 },
      }).success,
    ).toBe(false);
  });

  it("rejects unknown modifier keys", () => {
    expect(
      miningLaserSchema.safeParse({
        ...helixI,
        modifiers: { warpSpeed: 2 },
      }).success,
    ).toBe(false);
  });

  it("rejects non-positive modifier factors", () => {
    expect(
      miningLaserSchema.safeParse({
        ...helixI,
        modifiers: { resistance: 0 },
      }).success,
    ).toBe(false);
  });
});

describe("miningModuleSchema", () => {
  it("accepts a passive module without charges", () => {
    expect(miningModuleSchema.parse(riegerC3)).toEqual(riegerC3);
  });

  it("accepts an active module with charges and duration", () => {
    expect(miningModuleSchema.parse(surge)).toEqual(surge);
  });

  it("rejects unknown module types", () => {
    expect(
      miningModuleSchema.safeParse({ ...riegerC3, type: "hybrid" }).success,
    ).toBe(false);
  });

  it("rejects passive modules with charges", () => {
    expect(
      miningModuleSchema.safeParse({ ...riegerC3, charges: 3 }).success,
    ).toBe(false);
  });

  it("rejects active modules without charges", () => {
    expect(
      miningModuleSchema.safeParse({ ...surge, charges: null }).success,
    ).toBe(false);
  });
});

describe("miningGadgetSchema", () => {
  it("accepts a gadget with modifiers", () => {
    expect(miningGadgetSchema.parse(optimax)).toEqual(optimax);
  });
});

describe("constants", () => {
  it("exposes the closed modifier key set", () => {
    expect(MODIFIER_KEYS).toContain("resistance");
    expect(MODIFIER_KEYS).toContain("laserPower");
  });

  it("exposes module types", () => {
    expect(MODULE_TYPES).toEqual(["active", "passive"]);
  });

  it("limits loadout methods to ship and roc", () => {
    expect(LOADOUT_METHODS).toEqual(["ship", "roc"]);
  });
});
