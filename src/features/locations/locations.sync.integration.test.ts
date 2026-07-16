import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  LOC_UUIDS,
  SCWIKI_TEST_BASE_URL,
  scWikiServer,
} from "@/test/scwiki-server";
import {
  findAllCelestialBodies,
  findBodyBySlug,
  upsertCelestialBodies,
  upsertStarSystems,
} from "./locations.repository";
import { syncWikiLocations } from "./locations.sync";

describe("syncWikiLocations", () => {
  let db: Db;

  beforeAll(() => {
    process.env.SCWIKI_API_BASE_URL = SCWIKI_TEST_BASE_URL;
    scWikiServer.listen({ onUnhandledRequest: "error" });
  });

  afterAll(async () => {
    scWikiServer.close();
    delete process.env.SCWIKI_API_BASE_URL;
    await closeMongo();
  });

  beforeEach(async () => {
    db = await getDb(uniqueDbName("locations-sync"));
    await upsertStarSystems(db, [
      { code: "STANTON", name: "Stanton", status: "live", uexId: 68 },
      { code: "PYRO", name: "Pyro", status: "live", uexId: 64 },
    ]);
  });

  it("imports mining-relevant locations across all pages", async () => {
    const summary = await syncWikiLocations(db);

    const slugs = (await findAllCelestialBodies(db)).map((b) => b.slug).sort();
    expect(slugs).toEqual([
      "aberdeen",
      "arccorp",
      "arccorp-mining-area-061",
      "hur-l1",
      "hurston",
      "wala",
    ]);
    expect(summary.bodies).toBe(6);
  });

  it("skips cities, resource-less asteroids and unknown systems", async () => {
    const summary = await syncWikiLocations(db);

    expect(summary.skipped).toBe(4);
    expect(await findBodyBySlug(db, "STANTON", "lorville")).toBeNull();
    expect(await findBodyBySlug(db, "STANTON", "empty-rock")).toBeNull();
    expect(await findBodyBySlug(db, "STANTON", "halo-band-alpha")).toBeNull();
  });

  it("rescues asteroids referenced by mining data despite has_resources=false", async () => {
    const summary = await syncWikiLocations(db, {
      resourceLocationUuids: new Set([LOC_UUIDS.haloBand]),
    });

    expect(summary.bodies).toBe(7);
    const rescued = await findBodyBySlug(db, "STANTON", "halo-band-alpha");
    expect(rescued?.type).toBe("asteroidField");
    // Der wirklich leere Asteroid bleibt draußen
    expect(await findBodyBySlug(db, "STANTON", "empty-rock")).toBeNull();
  });

  it("stores wikiUuid, type mapping and the parent chain", async () => {
    await syncWikiLocations(db);

    const outpost = await findBodyBySlug(
      db,
      "STANTON",
      "arccorp-mining-area-061",
    );
    expect(outpost).toMatchObject({
      type: "outpost",
      parentSlug: "wala",
      wikiUuid: expect.any(String),
    });

    const lagrange = await findBodyBySlug(db, "STANTON", "hur-l1");
    expect(lagrange?.type).toBe("lagrangePoint");
    // Stern-Parent überlebt den Filter nicht -> genullt
    expect(lagrange?.parentSlug).toBeNull();
  });

  it("prunes bodies the wiki no longer provides", async () => {
    await upsertCelestialBodies(db, [
      {
        slug: "gone-moon",
        systemCode: "STANTON",
        type: "moon",
        name: "Gone Moon",
        parentSlug: null,
      },
    ]);

    const summary = await syncWikiLocations(db);

    expect(summary.pruned).toBe(1);
    expect(await findBodyBySlug(db, "STANTON", "gone-moon")).toBeNull();
  });

  it("is idempotent across repeated syncs", async () => {
    await syncWikiLocations(db);
    const summary = await syncWikiLocations(db);

    expect(summary.bodies).toBe(6);
    expect(summary.pruned).toBe(0);
    expect(await findAllCelestialBodies(db)).toHaveLength(6);
  });
});
