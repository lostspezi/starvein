import { describe, expect, it } from "vitest";
import { filterMaterials } from "./materials.filter";
import type { Material } from "./materials.schema";

const agricium: Material = {
  code: "AGRI",
  name: "Agricium",
  kind: "resource",
  oreCode: "AGRI",
  wikiUuid: "dc6fbcbb-5990-4ed5-82ee-93152dab7845",
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

const hadanite: Material = {
  code: "HADA",
  name: "Hadanite",
  kind: "item",
  oreCode: "HADA",
  wikiUuid: "125dd723-95ad-488d-830f-62c954445ca1",
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

const ice: Material = {
  code: "PRESSURIZED_ICE",
  name: "Pressurized Ice",
  kind: "resource",
  wikiUuid: "aaaaaaaa-0000-4000-8000-000000000001",
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

const materials = [agricium, hadanite, ice];

describe("filterMaterials", () => {
  it("returns everything with no filters", () => {
    expect(filterMaterials(materials, {})).toEqual(materials);
  });

  it("filters by kind", () => {
    expect(filterMaterials(materials, { kind: "item" })).toEqual([hadanite]);
    expect(filterMaterials(materials, { kind: "resource" })).toEqual([
      agricium,
      ice,
    ]);
  });

  it("filters to ore-backed materials only", () => {
    expect(filterMaterials(materials, { oresOnly: true })).toEqual([
      agricium,
      hadanite,
    ]);
  });

  it("matches free text against the name", () => {
    expect(filterMaterials(materials, { q: "pressurized" })).toEqual([ice]);
  });

  it("matches free text against the code, case-insensitive", () => {
    expect(filterMaterials(materials, { q: "hada" })).toEqual([hadanite]);
  });

  it("ignores surrounding whitespace in the query", () => {
    expect(filterMaterials(materials, { q: "  agricium  " })).toEqual([
      agricium,
    ]);
  });

  it("combines kind, ore filter and free text", () => {
    expect(
      filterMaterials(materials, { kind: "resource", oresOnly: true }),
    ).toEqual([agricium]);
    expect(
      filterMaterials(materials, { kind: "resource", q: "hadanite" }),
    ).toEqual([]);
  });
});
