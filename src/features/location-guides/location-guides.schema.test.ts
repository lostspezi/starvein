import { describe, expect, it } from "vitest";
import {
  locationAreaGuideSchema,
  locationGuideSchema,
} from "./location-guides.schema";

const base = {
  systemCode: "STANTON",
  bodySlug: "aaron-halo",
} as const;

describe("locationGuideSchema", () => {
  it("accepts a guide with only prose notes", () => {
    const parsed = locationGuideSchema.parse({
      ...base,
      note_de: "Von Hurston Richtung ArcCorp fliegen.",
      note_en: "Fly from Hurston toward ArcCorp.",
    });
    expect(parsed.bodySlug).toBe("aaron-halo");
  });

  it("accepts a guide with only routes", () => {
    const parsed = locationGuideSchema.parse({
      ...base,
      routes: [{ from: "Hurston", to: "ArcCorp", dropDistanceKm: 9_500_000 }],
    });
    expect(parsed.routes?.[0].dropDistanceKm).toBe(9_500_000);
  });

  it("accepts a single-language note", () => {
    expect(() =>
      locationGuideSchema.parse({ ...base, note_en: "English only." }),
    ).not.toThrow();
  });

  it("rejects an empty guide with neither note nor routes", () => {
    expect(() => locationGuideSchema.parse(base)).toThrow();
  });

  it("rejects a guide whose only route list is empty", () => {
    expect(() => locationGuideSchema.parse({ ...base, routes: [] })).toThrow();
  });

  it("rejects a non-positive drop distance", () => {
    expect(() =>
      locationGuideSchema.parse({
        ...base,
        routes: [{ from: "Hurston", to: "ArcCorp", dropDistanceKm: 0 }],
      }),
    ).toThrow();
  });

  it("rejects a bad body slug", () => {
    expect(() =>
      locationGuideSchema.parse({
        ...base,
        bodySlug: "Aaron Halo",
        note_en: "x",
      }),
    ).toThrow();
  });

  it("rejects an unknown system code", () => {
    expect(() =>
      locationGuideSchema.parse({
        ...base,
        systemCode: "SOL",
        note_en: "x",
      }),
    ).toThrow();
  });
});

describe("locationAreaGuideSchema", () => {
  const area = {
    systemCode: "STANTON",
    bodyType: "asteroidField",
    namePattern: "^Mining Base",
  } as const;

  it("accepts an area guide with a pattern and content", () => {
    const parsed = locationAreaGuideSchema.parse({
      ...area,
      note_en: "Reach the Aaron Halo.",
      routes: [{ from: "Hurston", to: "ArcCorp", dropDistanceKm: 9_500_000 }],
    });
    expect(parsed.bodyType).toBe("asteroidField");
    expect(parsed.namePattern).toBe("^Mining Base");
  });

  it("rejects an invalid body type", () => {
    expect(() =>
      locationAreaGuideSchema.parse({
        ...area,
        bodyType: "blackHole",
        note_en: "x",
      }),
    ).toThrow();
  });

  it("rejects an invalid regular expression pattern", () => {
    expect(() =>
      locationAreaGuideSchema.parse({
        ...area,
        namePattern: "[unterminated",
        note_en: "x",
      }),
    ).toThrow();
  });

  it("rejects an area guide without any content", () => {
    expect(() => locationAreaGuideSchema.parse(area)).toThrow();
  });
});
