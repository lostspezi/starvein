import { describe, expect, it } from "vitest";
import {
  groupWarehouseEntries,
  warehouseEntryInputSchema,
  warehouseEntrySchema,
  warehouseLocationKey,
  warehouseLocationLabel,
  warehouseMoveInputSchema,
  type WarehouseEntry,
} from "./warehouse.schema";

const BODY_LOCATION = {
  kind: "celestialBody",
  systemCode: "STANTON",
  bodySlug: "daymar",
  bodyName: "Daymar",
} as const;

function makeEntry(overrides: Partial<WarehouseEntry> = {}): WarehouseEntry {
  return {
    id: "entry-1",
    ownerUserId: "user-1",
    oreCode: "QUAN",
    kind: "raw",
    quantityScu: 32,
    location: BODY_LOCATION,
    createdAt: "2026-07-14T10:00:00.000Z",
    updatedAt: "2026-07-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("warehouseEntrySchema", () => {
  it("parses a valid entry with a celestial body location", () => {
    expect(warehouseEntrySchema.parse(makeEntry())).toEqual(makeEntry());
  });

  it("parses terminal and custom locations", () => {
    const terminal = makeEntry({
      location: { kind: "terminal", terminalId: 32, terminalName: "ARC-L1" },
    });
    const custom = makeEntry({
      location: { kind: "custom", label: "im Schiff" },
    });

    expect(warehouseEntrySchema.parse(terminal)).toEqual(terminal);
    expect(warehouseEntrySchema.parse(custom)).toEqual(custom);
  });

  it("rejects zero and negative quantities", () => {
    expect(
      warehouseEntrySchema.safeParse(makeEntry({ quantityScu: 0 })).success,
    ).toBe(false);
    expect(
      warehouseEntrySchema.safeParse(makeEntry({ quantityScu: -5 })).success,
    ).toBe(false);
  });

  it("rejects an unknown location kind", () => {
    const entry = {
      ...makeEntry(),
      location: { kind: "ship", label: "Cutlass" },
    };
    expect(warehouseEntrySchema.safeParse(entry).success).toBe(false);
  });

  it("parses an entry with a qualityRating in range", () => {
    const entry = makeEntry({ qualityRating: 720 });
    expect(warehouseEntrySchema.parse(entry)).toEqual(entry);
  });

  it("still parses an entry without a qualityRating (backward compatible)", () => {
    const entry = makeEntry();
    expect(warehouseEntrySchema.parse(entry).qualityRating).toBeUndefined();
  });

  it("accepts the boundary values 0 and 1000", () => {
    expect(
      warehouseEntrySchema.safeParse(makeEntry({ qualityRating: 0 })).success,
    ).toBe(true);
    expect(
      warehouseEntrySchema.safeParse(makeEntry({ qualityRating: 1000 }))
        .success,
    ).toBe(true);
  });

  it("rejects out-of-range and non-integer qualityRating", () => {
    for (const qualityRating of [-1, 1001, 12.5]) {
      expect(
        warehouseEntrySchema.safeParse(makeEntry({ qualityRating })).success,
      ).toBe(false);
    }
  });
});

describe("warehouseEntryInputSchema", () => {
  it("accepts input locations without denormalized names", () => {
    const parsed = warehouseEntryInputSchema.safeParse({
      oreCode: "QUAN",
      kind: "refined",
      quantityScu: 12.5,
      location: {
        kind: "celestialBody",
        systemCode: "STANTON",
        bodySlug: "daymar",
      },
      note: "Hangar-Box",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects denormalized names in input locations", () => {
    const parsed = warehouseEntryInputSchema.safeParse({
      oreCode: "QUAN",
      kind: "raw",
      quantityScu: 1,
      location: BODY_LOCATION,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects extra keys", () => {
    const parsed = warehouseEntryInputSchema.safeParse({
      oreCode: "QUAN",
      kind: "raw",
      quantityScu: 1,
      location: { kind: "custom", label: "x" },
      ownerUserId: "user-2",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a qualityRating and still rejects unknown keys", () => {
    expect(
      warehouseEntryInputSchema.safeParse({
        oreCode: "QUAN",
        kind: "refined",
        quantityScu: 12.5,
        qualityRating: 640,
        location: { kind: "custom", label: "im Schiff" },
      }).success,
    ).toBe(true);
    expect(
      warehouseEntryInputSchema.safeParse({
        oreCode: "QUAN",
        kind: "refined",
        quantityScu: 12.5,
        qualityRating: 1500,
        location: { kind: "custom", label: "im Schiff" },
      }).success,
    ).toBe(false);
  });
});

describe("warehouseMoveInputSchema", () => {
  it("accepts a location without a quantity (move everything)", () => {
    const parsed = warehouseMoveInputSchema.safeParse({
      location: { kind: "custom", label: "im Schiff" },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a partial quantity alongside a location", () => {
    const parsed = warehouseMoveInputSchema.safeParse({
      location: {
        kind: "celestialBody",
        systemCode: "STANTON",
        bodySlug: "daymar",
      },
      quantityScu: 12.5,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a denormalized location name", () => {
    const parsed = warehouseMoveInputSchema.safeParse({
      location: BODY_LOCATION,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects zero, negative and missing location", () => {
    expect(
      warehouseMoveInputSchema.safeParse({
        location: { kind: "custom", label: "x" },
        quantityScu: 0,
      }).success,
    ).toBe(false);
    expect(
      warehouseMoveInputSchema.safeParse({
        location: { kind: "custom", label: "x" },
        quantityScu: -3,
      }).success,
    ).toBe(false);
    expect(warehouseMoveInputSchema.safeParse({ quantityScu: 5 }).success).toBe(
      false,
    );
  });

  it("rejects extra keys", () => {
    expect(
      warehouseMoveInputSchema.safeParse({
        location: { kind: "custom", label: "x" },
        oreCode: "QUAN",
      }).success,
    ).toBe(false);
  });
});

describe("warehouse location helpers", () => {
  it("builds stable keys per location variant", () => {
    expect(warehouseLocationKey(BODY_LOCATION)).toBe("body:STANTON:daymar");
    expect(
      warehouseLocationKey({
        kind: "terminal",
        terminalId: 32,
        terminalName: "ARC-L1",
      }),
    ).toBe("terminal:32");
    expect(warehouseLocationKey({ kind: "custom", label: "im Schiff" })).toBe(
      "custom:im Schiff",
    );
  });

  it("labels each location variant", () => {
    expect(warehouseLocationLabel(BODY_LOCATION)).toBe("Daymar");
    expect(
      warehouseLocationLabel({
        kind: "terminal",
        terminalId: 32,
        terminalName: "ARC-L1",
      }),
    ).toBe("ARC-L1");
    expect(warehouseLocationLabel({ kind: "custom", label: "im Schiff" })).toBe(
      "im Schiff",
    );
  });

  it("groups entries by location with SCU totals", () => {
    const entries = [
      makeEntry({ id: "a", quantityScu: 10 }),
      makeEntry({ id: "b", quantityScu: 5.5 }),
      makeEntry({
        id: "c",
        quantityScu: 2,
        location: { kind: "custom", label: "im Schiff" },
      }),
    ];

    const groups = groupWarehouseEntries(entries);

    expect(groups).toHaveLength(2);
    const daymar = groups.find((g) => g.key === "body:STANTON:daymar");
    expect(daymar?.label).toBe("Daymar");
    expect(daymar?.totalScu).toBe(15.5);
    expect(daymar?.entries.map((e) => e.id)).toEqual(["a", "b"]);
  });
});
