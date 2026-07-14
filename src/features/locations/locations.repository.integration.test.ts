import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  countCelestialBodies,
  findAllCelestialBodies,
  findAllStarSystems,
  findBodiesBySystem,
  findBodyBySlug,
  findChildBodies,
  findStarSystemByCode,
  upsertCelestialBodies,
  upsertStarSystems,
} from "./locations.repository";
import type { CelestialBody, StarSystem } from "./locations.schema";

const stanton: StarSystem = {
  code: "STANTON",
  name: "Stanton",
  status: "live",
  uexId: 68,
};
const pyro: StarSystem = {
  code: "PYRO",
  name: "Pyro",
  status: "live",
  uexId: 64,
};

const crusader: CelestialBody = {
  slug: "crusader",
  systemCode: "STANTON",
  type: "planet",
  name: "Crusader",
  parentSlug: null,
  uexId: 59,
};
const yela: CelestialBody = {
  slug: "yela",
  systemCode: "STANTON",
  type: "moon",
  name: "Yela",
  parentSlug: "crusader",
  uexId: 75,
};
const cruL1: CelestialBody = {
  slug: "cru-l1",
  systemCode: "STANTON",
  type: "lagrangePoint",
  name: "Crusader Lagrange Point 1",
  parentSlug: "crusader",
  uexId: 331,
};
const monox: CelestialBody = {
  slug: "monox",
  systemCode: "PYRO",
  type: "planet",
  name: "Monox",
  parentSlug: null,
  uexId: 241,
};

describe("locations repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("locations-repo"));
    await upsertStarSystems(db, [pyro, stanton]);
    await upsertCelestialBodies(db, [yela, monox, cruL1, crusader]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns systems sorted by name", async () => {
    const systems = await findAllStarSystems(db);
    expect(systems.map((s) => s.code)).toEqual(["PYRO", "STANTON"]);
  });

  it("finds a system by code", async () => {
    await expect(findStarSystemByCode(db, "PYRO")).resolves.toEqual(pyro);
    await expect(findStarSystemByCode(db, "NYX")).resolves.toBeNull();
  });

  it("returns bodies of a system sorted by name", async () => {
    const bodies = await findBodiesBySystem(db, "STANTON");
    expect(bodies.map((b) => b.slug)).toEqual(["crusader", "cru-l1", "yela"]);
  });

  it("finds a body by system and slug", async () => {
    await expect(findBodyBySlug(db, "STANTON", "yela")).resolves.toEqual(yela);
    await expect(findBodyBySlug(db, "PYRO", "yela")).resolves.toBeNull();
  });

  it("returns children of a body sorted by name", async () => {
    const children = await findChildBodies(db, "STANTON", "crusader");
    expect(children.map((b) => b.slug)).toEqual(["cru-l1", "yela"]);
  });

  it("returns all bodies across systems sorted by name", async () => {
    const bodies = await findAllCelestialBodies(db);
    expect(bodies.map((b) => b.slug)).toEqual([
      "crusader",
      "cru-l1",
      "monox",
      "yela",
    ]);
  });

  it("counts all celestial bodies", async () => {
    await expect(countCelestialBodies(db)).resolves.toBe(4);
  });

  it("upserts systems and bodies idempotently", async () => {
    await upsertStarSystems(db, [stanton]);
    await upsertCelestialBodies(db, [{ ...yela, name: "Yela!" }]);

    expect(await findAllStarSystems(db)).toHaveLength(2);
    const bodies = await findBodiesBySystem(db, "STANTON");
    expect(bodies).toHaveLength(3);
    expect((await findBodyBySlug(db, "STANTON", "yela"))?.name).toBe("Yela!");
  });
});
