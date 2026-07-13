import { describe, expect, it } from "vitest";
import {
  LOADOUT_SORTS,
  loadoutContentKey,
  loadoutInputSchema,
  loadoutSchema,
} from "./loadouts.schema";

const loadout = {
  id: "8f14e45f-ceea-4677-a1b5-visible-0001",
  name: "Quantainium MOLE",
  description: "Helix auf allen Armen",
  method: "ship",
  vehicleCode: "mole",
  hardpoints: [
    { hardpointIndex: 0, laserCode: "helix-ii", moduleCodes: ["rieger-c3"] },
    { hardpointIndex: 1, laserCode: "helix-ii", moduleCodes: [] },
  ],
  gadgetCodes: ["optimax"],
  ownerUserId: "user-1",
  isPublic: true,
  votes: { up: 3 },
  voters: ["user-2", "user-3", "user-4"],
  patchVersion: "4.7",
  createdAt: "2026-07-13T08:00:00.000Z",
  updatedAt: "2026-07-13T08:00:00.000Z",
};

describe("loadoutSchema", () => {
  it("accepts a complete loadout", () => {
    expect(loadoutSchema.parse(loadout)).toEqual(loadout);
  });

  it("accepts a loadout without description", () => {
    const rest: Record<string, unknown> = { ...loadout };
    delete rest.description;
    expect(loadoutSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects names over 60 characters", () => {
    expect(
      loadoutSchema.safeParse({ ...loadout, name: "x".repeat(61) }).success,
    ).toBe(false);
  });

  it("rejects more than 3 modules per hardpoint", () => {
    expect(
      loadoutSchema.safeParse({
        ...loadout,
        hardpoints: [
          {
            hardpointIndex: 0,
            laserCode: "helix-ii",
            moduleCodes: ["a", "b", "c", "d"],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects negative vote counts", () => {
    expect(
      loadoutSchema.safeParse({ ...loadout, votes: { up: -1 } }).success,
    ).toBe(false);
  });
});

describe("loadoutInputSchema", () => {
  it("accepts only the user-editable fields", () => {
    const input = {
      name: loadout.name,
      description: loadout.description,
      method: loadout.method,
      vehicleCode: loadout.vehicleCode,
      hardpoints: loadout.hardpoints,
      gadgetCodes: loadout.gadgetCodes,
      isPublic: loadout.isPublic,
    };
    expect(loadoutInputSchema.parse(input)).toEqual(input);
  });

  it("rejects server-managed fields", () => {
    const input = {
      name: loadout.name,
      method: loadout.method,
      vehicleCode: loadout.vehicleCode,
      hardpoints: [],
      gadgetCodes: [],
      isPublic: false,
      votes: { up: 999 },
    };
    expect(loadoutInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("loadoutContentKey", () => {
  const content = {
    method: "ship" as const,
    vehicleCode: "mole",
    hardpoints: loadout.hardpoints,
    gadgetCodes: ["optimax", "boremax"],
  };

  it("is stable for identical content", () => {
    expect(loadoutContentKey(content)).toBe(loadoutContentKey({ ...content }));
  });

  it("ignores the order of moduleCodes, gadgetCodes and hardpoints", () => {
    const reordered = {
      ...content,
      hardpoints: [
        { hardpointIndex: 1, laserCode: "helix-ii", moduleCodes: [] },
        {
          hardpointIndex: 0,
          laserCode: "helix-ii",
          moduleCodes: ["rieger-c3"],
        },
      ],
      gadgetCodes: ["boremax", "optimax"],
    };
    expect(loadoutContentKey(reordered)).toBe(loadoutContentKey(content));
  });

  it("changes when a laser changes", () => {
    const swapped = {
      ...content,
      hardpoints: [
        {
          hardpointIndex: 0,
          laserCode: "arbor-mh2",
          moduleCodes: ["rieger-c3"],
        },
        { hardpointIndex: 1, laserCode: "helix-ii", moduleCodes: [] },
      ],
    };
    expect(loadoutContentKey(swapped)).not.toBe(loadoutContentKey(content));
  });

  it("changes when the vehicle changes", () => {
    expect(
      loadoutContentKey({ ...content, vehicleCode: "prospector" }),
    ).not.toBe(loadoutContentKey(content));
  });
});

describe("constants", () => {
  it("exposes the sort options", () => {
    expect(LOADOUT_SORTS).toEqual(["top", "new"]);
  });
});
