import { describe, expect, it } from "vitest";
import { blueprintSchema, BLUEPRINT_CATEGORIES } from "./blueprints.schema";

const base = {
  key: "BP_CRAFT_AMRS_LaserCannon_S1",
  slug: "bp_craft_amrs_lasercannon_s1",
  wikiUuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
  outputName: "Omnisky III Cannon",
  outputType: "WeaponGun",
  category: "ship-weapon" as const,
  craftTimeSeconds: 540,
  isAvailableByDefault: false,
  ingredients: [
    { materialCode: "AGRI", kind: "resource" as const, quantity: 0.36 },
    { materialCode: "HADA", kind: "item" as const, quantity: 7 },
  ],
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki" as const,
  syncedAt: "2026-07-16T00:00:00.000Z",
};

describe("blueprintSchema", () => {
  it("parses a valid blueprint", () => {
    expect(blueprintSchema.parse(base)).toEqual(base);
  });

  it("accepts a mixed-case wiki key with underscores", () => {
    expect(blueprintSchema.parse(base).key).toBe(
      "BP_CRAFT_AMRS_LaserCannon_S1",
    );
  });

  it("rejects an uppercase slug (slug is the lowercased key)", () => {
    expect(() =>
      blueprintSchema.parse({ ...base, slug: "BP_CRAFT_AMRS" }),
    ).toThrow();
  });

  /** SCU-Mengen sind im Spiel gebrochen — 0.36 muss durchgehen. */
  it("accepts a fractional SCU quantity for a resource ingredient", () => {
    const parsed = blueprintSchema.parse(base);
    expect(parsed.ingredients[0].quantity).toBe(0.36);
  });

  it("requires at least one ingredient", () => {
    expect(() => blueprintSchema.parse({ ...base, ingredients: [] })).toThrow();
  });

  it("rejects a non-positive ingredient quantity", () => {
    expect(() =>
      blueprintSchema.parse({
        ...base,
        ingredients: [{ materialCode: "AGRI", kind: "resource", quantity: 0 }],
      }),
    ).toThrow();
  });

  it("rejects an unknown ingredient kind", () => {
    expect(() =>
      blueprintSchema.parse({
        ...base,
        ingredients: [{ materialCode: "AGRI", kind: "blob", quantity: 1 }],
      }),
    ).toThrow();
  });

  it("rejects an unknown category", () => {
    expect(() =>
      blueprintSchema.parse({ ...base, category: "starship" }),
    ).toThrow();
  });

  it("requires a uuid for the wiki join", () => {
    expect(() =>
      blueprintSchema.parse({ ...base, wikiUuid: "nope" }),
    ).toThrow();
  });

  it("exposes the category vocabulary", () => {
    expect(BLUEPRINT_CATEGORIES).toContain("armor");
    expect(BLUEPRINT_CATEGORIES).toContain("ship-weapon");
    expect(BLUEPRINT_CATEGORIES).toContain("other");
  });

  it("accepts keys longer than 64 chars (seen live with 4.4 mission items)", () => {
    // 66 Zeichen — z. B. BP_CRAFT_Carryable_2H_FL_MissionItem_prototype_ship_component_2_a
    const longKey =
      "BP_CRAFT_Carryable_2H_FL_MissionItem_prototype_ship_component_2_a";
    expect(longKey.length).toBeGreaterThan(64);
    const parsed = blueprintSchema.parse({
      ...base,
      key: longKey,
      slug: longKey.toLowerCase(),
    });
    expect(parsed.key).toBe(longKey);
  });

  it("still rejects keys with characters outside [A-Za-z0-9_]", () => {
    expect(() =>
      blueprintSchema.parse({ ...base, key: "BP-CRAFT-THING" }),
    ).toThrow();
  });
});
