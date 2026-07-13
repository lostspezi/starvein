import { describe, expect, it } from "vitest";
import {
  compatibleLasers,
  laserFitsHardpoint,
  validateLoadout,
  type EquipmentCatalog,
} from "./compatibility";
import type {
  MiningGadget,
  MiningLaser,
  MiningModule,
  MiningVehicle,
} from "./equipment.schema";

const patchVersion = "4.7";

function vehicle(overrides: Partial<MiningVehicle> = {}): MiningVehicle {
  return {
    code: "mole",
    name: "MOLE",
    manufacturer: "Argo Astronautics",
    method: "ship",
    hardpoints: [{ size: 2 }, { size: 2 }, { size: 2 }],
    gadgetCapable: true,
    patchVersion,
    ...overrides,
  };
}

function laser(overrides: Partial<MiningLaser> = {}): MiningLaser {
  return {
    code: "helix-ii",
    name: "Helix II",
    manufacturer: "Thermyte Concern",
    size: 2,
    moduleSlots: 3,
    stats: {
      laserPower: 4600,
      extractionLaserPower: 900,
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
    modifiers: { laserPower: 1.32 },
    patchVersion,
    ...overrides,
  };
}

function gadget(overrides: Partial<MiningGadget> = {}): MiningGadget {
  return {
    code: "optimax",
    name: "OptiMax",
    manufacturer: "Shubin Interstellar",
    modifiers: {},
    patchVersion,
    ...overrides,
  };
}

function catalog(overrides: Partial<EquipmentCatalog> = {}): EquipmentCatalog {
  return {
    vehicles: [vehicle()],
    lasers: [laser()],
    modules: [module_()],
    gadgets: [gadget()],
    ...overrides,
  };
}

const validInput = {
  method: "ship" as const,
  vehicleCode: "mole",
  hardpoints: [
    { hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: ["rieger-c3"] },
  ],
  gadgetCodes: ["optimax"],
};

describe("laserFitsHardpoint", () => {
  it("requires an exact size match", () => {
    expect(laserFitsHardpoint(laser({ size: 2 }), 2)).toBe(true);
    expect(laserFitsHardpoint(laser({ size: 1 }), 2)).toBe(false);
    expect(laserFitsHardpoint(laser({ size: 2 }), 1)).toBe(false);
  });
});

describe("compatibleLasers", () => {
  it("filters by hardpoint size", () => {
    const s1 = laser({ code: "arbor-mh1", size: 1 });
    const s2 = laser({ code: "helix-ii", size: 2 });
    expect(compatibleLasers([s1, s2], 1)).toEqual([s1]);
    expect(compatibleLasers([s1, s2], 2)).toEqual([s2]);
  });
});

describe("validateLoadout", () => {
  it("accepts a valid ship loadout", () => {
    expect(validateLoadout(validInput, catalog())).toEqual([]);
  });

  it("accepts a roc loadout without hardpoints", () => {
    const roc = vehicle({
      code: "roc",
      method: "roc",
      hardpoints: [],
      gadgetCapable: false,
    });
    const input = {
      method: "roc" as const,
      vehicleCode: "roc",
      hardpoints: [],
      gadgetCodes: [],
    };
    expect(validateLoadout(input, catalog({ vehicles: [roc] }))).toEqual([]);
  });

  it("rejects an unknown vehicle", () => {
    const input = { ...validInput, vehicleCode: "carrack" };
    expect(validateLoadout(input, catalog())).toContain("unknownVehicle");
  });

  it("rejects a method mismatch", () => {
    const input = { ...validInput, method: "roc" as const };
    expect(validateLoadout(input, catalog())).toContain("methodMismatch");
  });

  it("rejects an unknown laser code", () => {
    const input = {
      ...validInput,
      hardpoints: [{ hardpointIndex: 0, laserCode: "nope", moduleCodes: [] }],
    };
    expect(validateLoadout(input, catalog())).toContain("unknownLaser");
  });

  it("rejects an out-of-range hardpoint index", () => {
    const input = {
      ...validInput,
      hardpoints: [
        { hardpointIndex: 3, laserCode: "helix-ii", moduleCodes: [] },
      ],
    };
    expect(validateLoadout(input, catalog())).toContain(
      "invalidHardpointIndex",
    );
  });

  it("rejects duplicate hardpoint indices", () => {
    const input = {
      ...validInput,
      hardpoints: [
        { hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: [] },
        { hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: [] },
      ],
    };
    expect(validateLoadout(input, catalog())).toContain(
      "duplicateHardpointIndex",
    );
  });

  it("rejects a laser size mismatch", () => {
    const s1 = laser({ code: "arbor-mh1", size: 1 });
    const input = {
      ...validInput,
      hardpoints: [
        { hardpointIndex: 0, laserCode: "arbor-mh1", moduleCodes: [] },
      ],
    };
    expect(
      validateLoadout(input, catalog({ lasers: [laser(), s1] })),
    ).toContain("laserSizeMismatch");
  });

  it("rejects more modules than the laser has slots", () => {
    const twoSlots = laser({ moduleSlots: 2 });
    const input = {
      ...validInput,
      hardpoints: [
        {
          hardpointIndex: 0,
          laserCode: "helix-ii",
          moduleCodes: ["rieger-c3", "rieger-c3", "rieger-c3"],
        },
      ],
    };
    expect(validateLoadout(input, catalog({ lasers: [twoSlots] }))).toContain(
      "tooManyModules",
    );
  });

  it("allows duplicate modules within the slot limit", () => {
    const input = {
      ...validInput,
      hardpoints: [
        {
          hardpointIndex: 0,
          laserCode: "helix-ii",
          moduleCodes: ["rieger-c3", "rieger-c3"],
        },
      ],
    };
    expect(validateLoadout(input, catalog())).toEqual([]);
  });

  it("rejects unknown module codes", () => {
    const input = {
      ...validInput,
      hardpoints: [
        { hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: ["nope"] },
      ],
    };
    expect(validateLoadout(input, catalog())).toContain("unknownModule");
  });

  it("rejects unknown gadget codes", () => {
    const input = { ...validInput, gadgetCodes: ["nope"] };
    expect(validateLoadout(input, catalog())).toContain("unknownGadget");
  });

  it("rejects gadgets on a vehicle that cannot use them", () => {
    const noGadgets = vehicle({ gadgetCapable: false });
    expect(
      validateLoadout(validInput, catalog({ vehicles: [noGadgets] })),
    ).toContain("gadgetsNotSupported");
  });

  it("rejects a ship loadout without any laser", () => {
    const input = { ...validInput, hardpoints: [], gadgetCodes: [] };
    expect(validateLoadout(input, catalog())).toContain("noLaserSelected");
  });

  it("rejects hardpoint assignments beyond the vehicle's hardpoints", () => {
    const roc = vehicle({
      code: "roc",
      method: "roc",
      hardpoints: [],
      gadgetCapable: false,
    });
    const input = {
      method: "roc" as const,
      vehicleCode: "roc",
      hardpoints: [
        { hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: [] },
      ],
      gadgetCodes: [],
    };
    expect(validateLoadout(input, catalog({ vehicles: [roc] }))).toContain(
      "invalidHardpointIndex",
    );
  });
});
