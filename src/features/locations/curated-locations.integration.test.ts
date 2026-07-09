import { describe, expect, it } from "vitest";
import {
  loadCuratedCelestialBodies,
  loadCuratedStarSystems,
} from "./curated-locations";

describe("curated star systems dataset", () => {
  it("contains Stanton, Pyro and Nyx", () => {
    const systems = loadCuratedStarSystems();
    expect(systems.map((s) => s.code).sort()).toEqual([
      "NYX",
      "PYRO",
      "STANTON",
    ]);
  });
});

describe("curated celestial bodies dataset", () => {
  it("loads 288 bodies incl. asteroid belts and fields", () => {
    const bodies = loadCuratedCelestialBodies();
    const byType = (type: string) =>
      bodies.filter((b) => b.type === type).length;

    expect(byType("planet")).toBe(11);
    expect(byType("moon")).toBe(18);
    expect(byType("lagrangePoint")).toBe(45);
    expect(byType("outpost")).toBe(115);
    expect(byType("asteroidBelt")).toBe(6);
    expect(byType("asteroidField")).toBe(93);
    expect(bodies.length).toBe(288);
  });

  it("contains the Aaron Halo as system-level asteroid belt", () => {
    const belt = loadCuratedCelestialBodies().find(
      (b) => b.slug === "aaron-halo",
    );
    expect(belt).toMatchObject({
      type: "asteroidBelt",
      systemCode: "STANTON",
      parentSlug: null,
    });
  });

  it("parents the Yela Ring to the moon Yela", () => {
    const ring = loadCuratedCelestialBodies().find(
      (b) => b.slug === "yela-ring",
    );
    expect(ring).toMatchObject({
      type: "asteroidBelt",
      systemCode: "STANTON",
      parentSlug: "yela",
    });
  });

  it("links ArcCorp Mining Area 045 to the moon Wala", () => {
    const outpost = loadCuratedCelestialBodies().find(
      (b) => b.slug === "arccorp-mining-area-045",
    );
    expect(outpost).toMatchObject({
      type: "outpost",
      systemCode: "STANTON",
      parentSlug: "wala",
    });
  });

  it("has unique slugs", () => {
    const slugs = loadCuratedCelestialBodies().map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("links Yela to Crusader in Stanton", () => {
    const yela = loadCuratedCelestialBodies().find((b) => b.slug === "yela");
    expect(yela).toMatchObject({
      type: "moon",
      systemCode: "STANTON",
      parentSlug: "crusader",
    });
  });

  it("links HUR-L1 to Hurston", () => {
    const hurl1 = loadCuratedCelestialBodies().find((b) => b.slug === "hur-l1");
    expect(hurl1).toMatchObject({
      type: "lagrangePoint",
      systemCode: "STANTON",
      parentSlug: "hurston",
    });
  });

  it("references existing parents and systems only", () => {
    const systems = new Set(loadCuratedStarSystems().map((s) => s.code));
    const bodies = loadCuratedCelestialBodies();
    const slugs = new Set(bodies.map((b) => b.slug));

    for (const body of bodies) {
      expect(systems.has(body.systemCode)).toBe(true);
      if (body.parentSlug !== null) {
        expect(slugs.has(body.parentSlug)).toBe(true);
      }
    }
  });
});
