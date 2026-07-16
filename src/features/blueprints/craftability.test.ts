import { describe, expect, it } from "vitest";
import type { Blueprint, BlueprintIngredient } from "./blueprints.schema";
import { computeCraftability } from "./craftability";

function blueprint(ingredients: BlueprintIngredient[]): Blueprint {
  return {
    key: "BP_CRAFT_TEST",
    slug: "bp_craft_test",
    wikiUuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
    outputName: "Test Item",
    outputType: "WeaponGun",
    category: "ship-weapon",
    craftTimeSeconds: 540,
    isAvailableByDefault: false,
    ingredients,
    gameVersion: "4.8.2-LIVE.12030094",
    sourceType: "wiki",
    syncedAt: "2026-07-16T00:00:00.000Z",
  };
}

// Realistische Mischung: Agricium in SCU (float), Hadanite als Stückzahl.
const laser = blueprint([
  { materialCode: "AGRI", kind: "resource", quantity: 0.36 },
  { materialCode: "HADA", kind: "item", quantity: 7 },
]);

describe("computeCraftability", () => {
  it("reports craftable when every ingredient is satisfied", () => {
    const result = computeCraftability(
      laser,
      new Map([
        ["AGRI", 0.36],
        ["HADA", 7],
      ]),
    );

    expect(result.status).toBe("craftable");
    expect(result.maxCraftable).toBe(1);
  });

  it("reports partial when one ingredient is short", () => {
    const result = computeCraftability(
      laser,
      new Map([
        ["AGRI", 0.2],
        ["HADA", 7],
      ]),
    );

    expect(result.status).toBe("partial");
    expect(result.maxCraftable).toBe(0);
    expect(result.components).toContainEqual({
      materialCode: "AGRI",
      kind: "resource",
      required: 0.36,
      have: 0.2,
      shortfall: expect.closeTo(0.16, 6),
    });
  });

  it("reports missing when nothing relevant is owned", () => {
    const result = computeCraftability(laser, new Map());

    expect(result.status).toBe("missing");
    expect(result.maxCraftable).toBe(0);
  });

  it("treats a material absent from the map as have=0", () => {
    const result = computeCraftability(laser, new Map([["AGRI", 0.36]]));

    expect(result.components).toContainEqual({
      materialCode: "HADA",
      kind: "item",
      required: 7,
      have: 0,
      shortfall: 7,
    });
    expect(result.status).toBe("partial");
  });

  it("carries the ingredient kind so the UI can pick the unit", () => {
    const result = computeCraftability(laser, new Map());

    expect(result.components.map((c) => c.kind)).toEqual(["resource", "item"]);
  });

  it("lets the bottleneck ingredient decide maxCraftable", () => {
    const result = computeCraftability(
      laser,
      new Map([
        ["AGRI", 3.6], // would allow 10
        ["HADA", 21], // allows only 3
      ]),
    );

    expect(result.status).toBe("craftable");
    expect(result.maxCraftable).toBe(3);
  });

  it("floors maxCraftable on non-integer ratios", () => {
    const result = computeCraftability(
      blueprint([{ materialCode: "AGRI", kind: "resource", quantity: 0.36 }]),
      new Map([["AGRI", 1]]),
    );

    // 1 / 0.36 = 2.77… -> 2
    expect(result.maxCraftable).toBe(2);
  });

  /** Ohne Epsilon würde 0.1+0.2 = 0.30000000000000004 hier "partial" liefern. */
  it("is not fooled by floating point drift on exact SCU amounts", () => {
    const result = computeCraftability(
      blueprint([{ materialCode: "AGRI", kind: "resource", quantity: 0.3 }]),
      new Map([["AGRI", 0.1 + 0.2]]),
    );

    expect(result.status).toBe("craftable");
    expect(result.maxCraftable).toBe(1);
  });

  it("handles the smallest real SCU amount (0.01)", () => {
    const result = computeCraftability(
      blueprint([{ materialCode: "AGRI", kind: "resource", quantity: 0.01 }]),
      new Map([["AGRI", 0.05]]),
    );

    expect(result.status).toBe("craftable");
    expect(result.maxCraftable).toBe(5);
  });

  it("handles an empty inventory map (new user)", () => {
    const result = computeCraftability(laser, new Map());

    expect(result.components.every((c) => c.have === 0)).toBe(true);
    expect(result.maxCraftable).toBe(0);
  });

  it("ignores unrelated materials in the inventory", () => {
    const result = computeCraftability(
      blueprint([{ materialCode: "AGRI", kind: "resource", quantity: 1 }]),
      new Map([
        ["AGRI", 1],
        ["SALD", 999],
      ]),
    );

    expect(result.status).toBe("craftable");
    expect(result.components).toHaveLength(1);
  });

  it("reports partial when some but not all materials are owned", () => {
    const result = computeCraftability(laser, new Map([["HADA", 1]]));

    expect(result.status).toBe("partial");
  });
});
