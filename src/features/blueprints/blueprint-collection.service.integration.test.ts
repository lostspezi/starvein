import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { isBlueprintCollected } from "./blueprint-collection.repository";
import {
  BlueprintNotFoundError,
  collectBlueprint,
  uncollectBlueprint,
} from "./blueprint-collection.service";
import { upsertBlueprints } from "./blueprints.repository";
import type { Blueprint } from "./blueprints.schema";

const USER = "user-1";

const laser: Blueprint = {
  key: "BP_CRAFT_AMRS_LaserCannon_S1",
  slug: "bp_craft_amrs_lasercannon_s1",
  wikiUuid: "26838ca7-418a-47d2-8429-7339ebbb8993",
  outputName: "Omnisky III Cannon",
  outputType: "WeaponGun",
  category: "ship-weapon",
  craftTimeSeconds: 540,
  isAvailableByDefault: false,
  ingredients: [{ materialCode: "AGRI", kind: "resource", quantity: 0.36 }],
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

describe("blueprint collection service", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("bp-collection-service"));
    await upsertBlueprints(db, [laser]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("collects an existing blueprint", async () => {
    await collectBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1");

    await expect(
      isBlueprintCollected(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1"),
    ).resolves.toBe(true);
  });

  it("rejects collecting a blueprint that does not exist", async () => {
    await expect(
      collectBlueprint(db, USER, "BP_CRAFT_NOPE"),
    ).rejects.toBeInstanceOf(BlueprintNotFoundError);
  });

  it("uncollects a blueprint", async () => {
    await collectBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1");
    await uncollectBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1");

    await expect(
      isBlueprintCollected(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1"),
    ).resolves.toBe(false);
  });

  it("allows uncollecting a blueprint that is no longer in the catalog", async () => {
    await collectBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1");
    await db.collection("blueprints").deleteMany({});

    await expect(
      uncollectBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1"),
    ).resolves.toBeUndefined();
    await expect(
      isBlueprintCollected(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1"),
    ).resolves.toBe(false);
  });
});
