import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import type { CelestialBody } from "@/features/locations/locations.schema";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  upsertLocationAreaGuides,
  upsertLocationGuides,
} from "./location-guides.repository";
import type {
  LocationAreaGuide,
  LocationGuide,
} from "./location-guides.schema";
import { resolveLocationGuide } from "./location-guides.service";

const glaciemGuide: LocationGuide = {
  systemCode: "NYX",
  bodySlug: "glaciem-ring",
  note_en: "Jump into Nyx, quantum travel to Delamar.",
};

const haloArea: LocationAreaGuide = {
  systemCode: "STANTON",
  bodyType: "asteroidField",
  namePattern: "^Mining Base",
  note_en: "These clusters sit inside the Aaron Halo.",
  routes: [{ from: "Hurston", to: "ArcCorp", dropDistanceKm: 9_500_000 }],
};

const glaciemBody: CelestialBody = {
  slug: "glaciem-ring",
  systemCode: "NYX",
  type: "asteroidField",
  name: "Glaciem Ring",
  parentSlug: null,
};

const miningBaseBody: CelestialBody = {
  slug: "mining-base-01k-i43",
  systemCode: "STANTON",
  type: "asteroidField",
  name: "Mining Base #01K-I43",
  parentSlug: null,
};

const crusaderBody: CelestialBody = {
  slug: "crusader",
  systemCode: "STANTON",
  type: "planet",
  name: "Crusader",
  parentSlug: null,
};

describe("resolveLocationGuide", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("location-guides-service"));
    await upsertLocationGuides(db, [glaciemGuide]);
    await upsertLocationAreaGuides(db, [haloArea]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns the exact per-body guide when one exists", async () => {
    const guide = await resolveLocationGuide(db, glaciemBody);
    expect(guide).toEqual(glaciemGuide);
  });

  it("applies the Aaron Halo area rule to a Stanton mining base", async () => {
    const guide = await resolveLocationGuide(db, miningBaseBody);
    expect(guide?.bodySlug).toBe("mining-base-01k-i43");
    expect(guide?.note_en).toContain("Aaron Halo");
    expect(guide?.routes).toHaveLength(1);
  });

  it("returns null for a body that matches no area rule", async () => {
    expect(await resolveLocationGuide(db, crusaderBody)).toBeNull();
  });

  it("prefers an exact guide over a matching area rule", async () => {
    const explicit: LocationGuide = {
      systemCode: "STANTON",
      bodySlug: "mining-base-01k-i43",
      note_en: "Special hand-written route.",
    };
    await upsertLocationGuides(db, [explicit]);

    const guide = await resolveLocationGuide(db, miningBaseBody);
    expect(guide).toEqual(explicit);
    expect(guide?.routes).toBeUndefined();
  });
});
