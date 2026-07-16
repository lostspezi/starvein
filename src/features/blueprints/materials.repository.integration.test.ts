import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  ensureMaterialIndexes,
  findAllMaterials,
  findMaterialByCode,
  findMaterialsByOreCode,
  pruneMaterialsNotIn,
  upsertMaterials,
} from "./materials.repository";
import type { Material } from "./materials.schema";

const agricium: Material = {
  code: "AGRI",
  name: "Agricium",
  kind: "resource",
  oreCode: "AGRI",
  wikiUuid: "dc6fbcbb-5990-4ed5-82ee-93152dab7845",
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

const ice: Material = {
  code: "PRESSURIZED_ICE",
  name: "Pressurized Ice",
  kind: "resource",
  wikiUuid: "aaaaaaaa-0000-4000-8000-000000000001",
  gameVersion: "4.8.2-LIVE.12030094",
  sourceType: "wiki",
  syncedAt: "2026-07-16T00:00:00.000Z",
};

describe("materials repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("materials-repo"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns an empty array for an empty collection", async () => {
    await expect(findAllMaterials(db)).resolves.toEqual([]);
  });

  it("returns inserted materials sorted by name", async () => {
    await upsertMaterials(db, [ice, agricium]);

    const materials = await findAllMaterials(db);

    expect(materials.map((m) => m.code)).toEqual(["AGRI", "PRESSURIZED_ICE"]);
  });

  it("upserts idempotently by code", async () => {
    await upsertMaterials(db, [agricium]);
    await upsertMaterials(db, [{ ...agricium, kind: "item" }]);

    const materials = await findAllMaterials(db);

    expect(materials).toHaveLength(1);
    expect(materials[0].kind).toBe("item");
  });

  it("finds a single material by code", async () => {
    await upsertMaterials(db, [agricium, ice]);
    await expect(findMaterialByCode(db, "AGRI")).resolves.toEqual(agricium);
    await expect(findMaterialByCode(db, "NOPE")).resolves.toBeNull();
  });

  it("finds materials linked to an ore code", async () => {
    await upsertMaterials(db, [agricium, ice]);

    const linked = await findMaterialsByOreCode(db, "AGRI");
    expect(linked.map((m) => m.code)).toEqual(["AGRI"]);

    await expect(findMaterialsByOreCode(db, "QUAN")).resolves.toEqual([]);
  });

  it("prunes materials the current sync no longer provides", async () => {
    await upsertMaterials(db, [agricium, ice]);

    const pruned = await pruneMaterialsNotIn(db, ["AGRI"]);

    expect(pruned).toBe(1);
    expect((await findAllMaterials(db)).map((m) => m.code)).toEqual(["AGRI"]);
  });

  it("prunes nothing when every material is still provided", async () => {
    await upsertMaterials(db, [agricium, ice]);

    await expect(
      pruneMaterialsNotIn(db, ["AGRI", "PRESSURIZED_ICE"]),
    ).resolves.toBe(0);
  });

  it("strips mongo _id from results", async () => {
    await upsertMaterials(db, [agricium]);

    const [material] = await findAllMaterials(db);

    expect(material).not.toHaveProperty("_id");
  });

  it("creates a unique index on code (idempotent)", async () => {
    await ensureMaterialIndexes(db);
    await ensureMaterialIndexes(db);

    const indexes = await db.collection("materials").indexes();
    expect(indexes.find((i) => i.key.code === 1)?.unique).toBe(true);
  });
});
