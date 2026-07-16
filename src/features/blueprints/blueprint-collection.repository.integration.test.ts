import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  addCollectedBlueprint,
  ensureBlueprintCollectionIndexes,
  isBlueprintCollected,
  listCollectedBlueprintKeys,
  listCollectedBlueprints,
  removeCollectedBlueprint,
} from "./blueprint-collection.repository";

const USER = "user-1";
const OTHER = "user-2";

describe("blueprint collection repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("bp-collection-repo"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns an empty collection for a new user", async () => {
    await expect(listCollectedBlueprints(db, USER)).resolves.toEqual([]);
  });

  it("adds a blueprint to the user's collection", async () => {
    await addCollectedBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1");

    const collected = await listCollectedBlueprints(db, USER);

    expect(collected).toHaveLength(1);
    expect(collected[0]).toMatchObject({
      userId: USER,
      blueprintKey: "BP_CRAFT_AMRS_LaserCannon_S1",
    });
    expect(collected[0].collectedAt).toEqual(expect.any(String));
  });

  it("adds idempotently and keeps the original collectedAt", async () => {
    await addCollectedBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1");
    const [first] = await listCollectedBlueprints(db, USER);

    await addCollectedBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1");
    const collected = await listCollectedBlueprints(db, USER);

    expect(collected).toHaveLength(1);
    expect(collected[0].collectedAt).toBe(first.collectedAt);
  });

  it("reports whether a blueprint is collected", async () => {
    await addCollectedBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1");

    await expect(
      isBlueprintCollected(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1"),
    ).resolves.toBe(true);
    await expect(
      isBlueprintCollected(db, USER, "BP_CRAFT_Char_Armor_Helmet_01"),
    ).resolves.toBe(false);
  });

  it("removes a blueprint from the collection", async () => {
    await addCollectedBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1");
    await removeCollectedBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1");

    await expect(listCollectedBlueprints(db, USER)).resolves.toEqual([]);
  });

  it("isolates collections per user", async () => {
    await addCollectedBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1");

    await expect(listCollectedBlueprints(db, OTHER)).resolves.toEqual([]);
    await expect(
      isBlueprintCollected(db, OTHER, "BP_CRAFT_AMRS_LaserCannon_S1"),
    ).resolves.toBe(false);
  });

  it("does not remove another user's entry", async () => {
    await addCollectedBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1");
    await removeCollectedBlueprint(db, OTHER, "BP_CRAFT_AMRS_LaserCannon_S1");

    await expect(
      isBlueprintCollected(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1"),
    ).resolves.toBe(true);
  });

  it("lists just the collected keys for lookups", async () => {
    await addCollectedBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1");
    await addCollectedBlueprint(db, USER, "BP_CRAFT_Char_Armor_Helmet_01");

    const keys = await listCollectedBlueprintKeys(db, USER);

    expect([...keys].sort()).toEqual([
      "BP_CRAFT_AMRS_LaserCannon_S1",
      "BP_CRAFT_Char_Armor_Helmet_01",
    ]);
  });

  it("strips mongo _id from results", async () => {
    await addCollectedBlueprint(db, USER, "BP_CRAFT_AMRS_LaserCannon_S1");

    const [entry] = await listCollectedBlueprints(db, USER);

    expect(entry).not.toHaveProperty("_id");
  });

  it("creates a unique compound index (idempotent)", async () => {
    await ensureBlueprintCollectionIndexes(db);
    await ensureBlueprintCollectionIndexes(db);

    const indexes = await db.collection("blueprintCollection").indexes();
    const compound = indexes.find(
      (i) => i.key.userId === 1 && i.key.blueprintKey === 1,
    );
    expect(compound?.unique).toBe(true);
  });
});
