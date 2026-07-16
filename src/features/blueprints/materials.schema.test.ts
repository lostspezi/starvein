import { describe, expect, it } from "vitest";
import { materialSchema, MATERIAL_KINDS } from "./materials.schema";

const base = {
  code: "AGRI",
  name: "Agricium",
  kind: "resource" as const,
  oreCode: "AGRI",
  wikiUuid: "dc6fbcbb-5990-4ed5-82ee-93152dab7845",
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki" as const,
  syncedAt: "2026-07-16T00:00:00.000Z",
};

describe("materialSchema", () => {
  it("parses a valid ore-backed material", () => {
    expect(materialSchema.parse(base)).toEqual(base);
  });

  it("allows a material without an oreCode (non-ore ingredient)", () => {
    const ice = {
      ...base,
      code: "PRESSURIZED_ICE",
      name: "Pressurized Ice",
      oreCode: undefined,
    };
    const parsed = materialSchema.parse(ice);
    expect(parsed.oreCode).toBeUndefined();
  });

  it("accepts underscores in a derived code", () => {
    expect(
      materialSchema.parse({ ...base, code: "PRESSURIZED_ICE" }).code,
    ).toBe("PRESSURIZED_ICE");
  });

  it("rejects a lowercase or too-short code", () => {
    expect(() => materialSchema.parse({ ...base, code: "agri" })).toThrow();
    expect(() => materialSchema.parse({ ...base, code: "A" })).toThrow();
  });

  it("rejects an unknown kind", () => {
    expect(() => materialSchema.parse({ ...base, kind: "gadget" })).toThrow();
  });

  it("rejects an oreCode that violates the ore regex", () => {
    expect(() => materialSchema.parse({ ...base, oreCode: "AGRI1" })).toThrow();
  });

  it("requires a uuid for the wiki join", () => {
    expect(() => materialSchema.parse({ ...base, wikiUuid: "nope" })).toThrow();
  });

  it("exposes the kind vocabulary", () => {
    expect(MATERIAL_KINDS).toEqual(["resource", "item"]);
  });
});
