import { describe, expect, it } from "vitest";
import type { WarehouseEntry } from "@/features/warehouse/warehouse.schema";
import type { Material } from "./materials.schema";
import { buildWarehouseMaterialMap } from "./warehouse-inventory";

function entry(overrides: Partial<WarehouseEntry> = {}): WarehouseEntry {
  return {
    id: "e1",
    ownerUserId: "user-1",
    oreCode: "AGRI",
    kind: "raw",
    quantityScu: 1,
    location: { kind: "custom", label: "im Schiff" },
    createdAt: "2026-07-16T00:00:00.000Z",
    updatedAt: "2026-07-16T00:00:00.000Z",
    ...overrides,
  };
}

function material(overrides: Partial<Material> = {}): Material {
  return {
    code: "AGRI",
    name: "Agricium",
    kind: "resource",
    oreCode: "AGRI",
    wikiUuid: "dc6fbcbb-5990-4ed5-82ee-93152dab7845",
    gameVersion: "4.8",
    sourceType: "wiki",
    syncedAt: "2026-07-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildWarehouseMaterialMap", () => {
  it("sums raw and refined stock of the same ore", () => {
    const map = buildWarehouseMaterialMap(
      [
        entry({ id: "a", oreCode: "AGRI", kind: "raw", quantityScu: 2 }),
        entry({ id: "b", oreCode: "AGRI", kind: "refined", quantityScu: 3.5 }),
      ],
      [material({ code: "AGRI", oreCode: "AGRI" })],
    );

    expect(map.get("AGRI")).toBe(5.5);
  });

  it("keys the map by material code, not ore code", () => {
    // Material whose code differs from its ore code — blueprint ingredients
    // reference the material code, so that must be the map key.
    const map = buildWarehouseMaterialMap(
      [entry({ oreCode: "HADA", quantityScu: 4 })],
      [material({ code: "PROC_HADA", oreCode: "HADA" })],
    );

    expect(map.get("PROC_HADA")).toBe(4);
    expect(map.has("HADA")).toBe(false);
  });

  it("omits materials without an ore code (crafted or item materials)", () => {
    const map = buildWarehouseMaterialMap(
      [entry({ oreCode: "AGRI", quantityScu: 2 })],
      [
        material({ code: "AGRI", oreCode: "AGRI" }),
        material({ code: "PRESSURIZED_ICE", oreCode: undefined }),
      ],
    );

    expect(map.get("AGRI")).toBe(2);
    expect(map.has("PRESSURIZED_ICE")).toBe(false);
  });

  it("omits ore materials with no matching warehouse stock", () => {
    const map = buildWarehouseMaterialMap(
      [entry({ oreCode: "AGRI", quantityScu: 2 })],
      [
        material({ code: "AGRI", oreCode: "AGRI" }),
        material({ code: "QUAN", oreCode: "QUAN" }),
      ],
    );

    expect(map.get("AGRI")).toBe(2);
    expect(map.has("QUAN")).toBe(false);
  });

  it("maps several distinct ores independently", () => {
    const map = buildWarehouseMaterialMap(
      [
        entry({ id: "a", oreCode: "AGRI", quantityScu: 2 }),
        entry({ id: "b", oreCode: "QUAN", quantityScu: 7 }),
      ],
      [
        material({ code: "AGRI", oreCode: "AGRI" }),
        material({ code: "QUAN", oreCode: "QUAN" }),
      ],
    );

    expect(map.get("AGRI")).toBe(2);
    expect(map.get("QUAN")).toBe(7);
  });
});
