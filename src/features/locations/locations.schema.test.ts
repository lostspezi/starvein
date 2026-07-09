import { describe, expect, it } from "vitest";
import { celestialBodySchema, starSystemSchema } from "./locations.schema";

const validSystem = {
  code: "STANTON",
  name: "Stanton",
  status: "live",
  uexId: 68,
};

const validBody = {
  slug: "yela",
  systemCode: "STANTON",
  type: "moon",
  name: "Yela",
  parentSlug: "crusader",
  uexId: 75,
};

describe("starSystemSchema", () => {
  it("accepts a valid system", () => {
    expect(starSystemSchema.parse(validSystem)).toEqual(validSystem);
  });

  it("rejects unknown status values", () => {
    expect(
      starSystemSchema.safeParse({ ...validSystem, status: "beta" }).success,
    ).toBe(false);
  });
});

describe("celestialBodySchema", () => {
  it("accepts a valid moon with parent", () => {
    expect(celestialBodySchema.parse(validBody)).toEqual(validBody);
  });

  it("accepts a planet without parent", () => {
    const planet = {
      ...validBody,
      slug: "crusader",
      type: "planet",
      name: "Crusader",
      parentSlug: null,
      uexId: 59,
    };
    expect(celestialBodySchema.parse(planet)).toEqual(planet);
  });

  it("rejects unknown body types", () => {
    expect(
      celestialBodySchema.safeParse({ ...validBody, type: "blackHole" })
        .success,
    ).toBe(false);
  });

  it("rejects slugs with uppercase or spaces", () => {
    expect(
      celestialBodySchema.safeParse({ ...validBody, slug: "Yela" }).success,
    ).toBe(false);
    expect(
      celestialBodySchema.safeParse({ ...validBody, slug: "ye la" }).success,
    ).toBe(false);
  });
});
