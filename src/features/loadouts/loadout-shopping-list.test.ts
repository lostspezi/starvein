import { describe, expect, it } from "vitest";
import type { EquipmentCatalog } from "./compatibility";
import { buildShoppingList } from "./loadout-shopping-list";

const patchVersion = "4.7";

const catalog: EquipmentCatalog = {
  vehicles: [],
  lasers: [
    {
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
      modifiers: {},
      patchVersion,
    },
    {
      code: "impact-ii",
      name: "Impact II",
      manufacturer: "Thermyte Concern",
      size: 2,
      moduleSlots: 3,
      stats: {
        laserPower: 3360,
        extractionLaserPower: 3145,
        optimalRange: 60,
        maxRange: 180,
      },
      modifiers: {},
      patchVersion,
    },
  ],
  modules: [
    {
      code: "rieger-c3",
      name: "Rieger-C3",
      manufacturer: "Shubin Interstellar",
      type: "passive",
      charges: null,
      durationSeconds: null,
      modifiers: {},
      patchVersion,
    },
  ],
  gadgets: [
    {
      code: "optimax",
      name: "OptiMax",
      manufacturer: "Greycat Industrial",
      modifiers: {},
      patchVersion,
    },
  ],
};

describe("buildShoppingList", () => {
  it("aggregates distinct lasers, modules and gadgets with quantities", () => {
    const entries = buildShoppingList(
      {
        hardpoints: [
          {
            hardpointIndex: 0,
            laserCode: "helix-ii",
            moduleCodes: ["rieger-c3", "rieger-c3"],
          },
          { hardpointIndex: 1, laserCode: "helix-ii", moduleCodes: [] },
          {
            hardpointIndex: 2,
            laserCode: "impact-ii",
            moduleCodes: ["rieger-c3"],
          },
        ],
        gadgetCodes: ["optimax"],
      },
      catalog,
    );

    expect(entries).toEqual([
      { code: "helix-ii", kind: "laser", name: "Helix II", quantity: 2 },
      { code: "impact-ii", kind: "laser", name: "Impact II", quantity: 1 },
      { code: "rieger-c3", kind: "module", name: "Rieger-C3", quantity: 3 },
      { code: "optimax", kind: "gadget", name: "OptiMax", quantity: 1 },
    ]);
  });

  it("skips codes missing from the catalog", () => {
    const entries = buildShoppingList(
      {
        hardpoints: [
          { hardpointIndex: 0, laserCode: "unknown", moduleCodes: ["nope"] },
        ],
        gadgetCodes: ["gone"],
      },
      catalog,
    );
    expect(entries).toEqual([]);
  });

  it("returns an empty list for empty loadouts", () => {
    expect(
      buildShoppingList({ hardpoints: [], gadgetCodes: [] }, catalog),
    ).toEqual([]);
  });
});
