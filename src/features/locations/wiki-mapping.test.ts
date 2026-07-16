import { describe, expect, it } from "vitest";
import type { ScWikiLocation } from "@/lib/scwiki-client";
import {
  dropOrphanParents,
  mapWikiLocation,
  systemCodeFromWikiSystem,
} from "./wiki-mapping";
import type { CelestialBody } from "./locations.schema";

const KNOWN_SYSTEMS = new Set(["STANTON", "PYRO", "NYX"]);

function wikiLocation(overrides: Partial<ScWikiLocation> = {}): ScWikiLocation {
  return {
    uuid: "10000000-0000-4000-8000-00000000000a",
    slug: "aberdeen",
    name: "Aberdeen",
    has_resources: true,
    system: "Stanton System",
    parent: {
      uuid: "10000000-0000-4000-8000-00000000000b",
      name: "Hurston",
      type_name: "Planet",
      slug: "hurston",
    },
    type: { name: "Moon", classification: "Moon" },
    version: "4.8.2-LIVE.12030094",
    ...overrides,
  };
}

describe("systemCodeFromWikiSystem", () => {
  it("strips the System suffix and uppercases", () => {
    expect(systemCodeFromWikiSystem("Stanton System")).toBe("STANTON");
    expect(systemCodeFromWikiSystem("Pyro System")).toBe("PYRO");
  });
});

describe("mapWikiLocation", () => {
  it("maps planets, moons and outposts", () => {
    expect(
      mapWikiLocation(
        wikiLocation({ type: { name: "Planet", classification: "Planet" } }),
        KNOWN_SYSTEMS,
      )?.type,
    ).toBe("planet");
    expect(mapWikiLocation(wikiLocation(), KNOWN_SYSTEMS)?.type).toBe("moon");
    expect(
      mapWikiLocation(
        wikiLocation({ type: { name: "Outpost", classification: "Outpost" } }),
        KNOWN_SYSTEMS,
      )?.type,
    ).toBe("outpost");
  });

  it("carries slug, name, systemCode, parentSlug and wikiUuid", () => {
    const body = mapWikiLocation(wikiLocation(), KNOWN_SYSTEMS);

    expect(body).toMatchObject({
      slug: "aberdeen",
      name: "Aberdeen",
      systemCode: "STANTON",
      parentSlug: "hurston",
      wikiUuid: "10000000-0000-4000-8000-00000000000a",
    });
  });

  it("skips unknown classifications like Manmade", () => {
    expect(
      mapWikiLocation(
        wikiLocation({
          type: { name: "LandingZone", classification: "Manmade" },
        }),
        KNOWN_SYSTEMS,
      ),
    ).toBeNull();
  });

  it("skips locations in unknown systems", () => {
    expect(
      mapWikiLocation(
        wikiLocation({ system: "Frontier System" }),
        KNOWN_SYSTEMS,
      ),
    ).toBeNull();
  });

  it("keeps resource-bearing asteroids only", () => {
    const asteroid = wikiLocation({
      name: "Halo Cluster Alpha",
      slug: "halo-cluster-alpha",
      type: { name: "Asteroid", classification: "Asteroid" },
    });

    expect(mapWikiLocation(asteroid, KNOWN_SYSTEMS)?.type).toBe(
      "asteroidField",
    );
    expect(
      mapWikiLocation({ ...asteroid, has_resources: false }, KNOWN_SYSTEMS),
    ).toBeNull();
  });

  it("classifies L1-L5 asteroid clusters as lagrange points", () => {
    const body = mapWikiLocation(
      wikiLocation({
        name: "HUR L1",
        slug: "hur-l1",
        type: { name: "Asteroid_ValidQT", classification: "Asteroid" },
      }),
      KNOWN_SYSTEMS,
    );

    expect(body?.type).toBe("lagrangePoint");
  });
});

describe("dropOrphanParents", () => {
  it("nulls parent references that did not survive the filter", () => {
    const bodies: CelestialBody[] = [
      {
        slug: "hurston",
        systemCode: "STANTON",
        type: "planet",
        name: "Hurston",
        // Stern "stanton" wird nicht gesynct -> muss genullt werden
        parentSlug: "stanton",
      },
      {
        slug: "aberdeen",
        systemCode: "STANTON",
        type: "moon",
        name: "Aberdeen",
        parentSlug: "hurston",
      },
    ];

    const result = dropOrphanParents(bodies);

    expect(result.find((b) => b.slug === "hurston")?.parentSlug).toBeNull();
    expect(result.find((b) => b.slug === "aberdeen")?.parentSlug).toBe(
      "hurston",
    );
  });
});
