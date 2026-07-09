import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { findAllOres, findOreByCode, upsertOres } from "./ores.repository";
import type { Ore } from "./ores.schema";

const quan: Ore = {
  code: "QUAN",
  name_de: "Quantainium",
  name_en: "Quantainium",
  rarityTier: "legendary",
  mineableBy: { ship: true, roc: false, fps: false },
};

const hada: Ore = {
  code: "HADA",
  name_de: "Hadanite",
  name_en: "Hadanite",
  rarityTier: "epic",
  mineableBy: { ship: false, roc: true, fps: true },
};

describe("ores repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("ores-repo"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("returns an empty array for an empty collection", async () => {
    await expect(findAllOres(db)).resolves.toEqual([]);
  });

  it("returns inserted ores sorted by english name", async () => {
    await upsertOres(db, [quan, hada]);

    const ores = await findAllOres(db);

    expect(ores.map((o) => o.code)).toEqual(["HADA", "QUAN"]);
  });

  it("upserts idempotently by code", async () => {
    await upsertOres(db, [quan]);
    await upsertOres(db, [{ ...quan, rarityTier: "epic" }]);

    const ores = await findAllOres(db);

    expect(ores).toHaveLength(1);
    expect(ores[0].rarityTier).toBe("epic");
  });

  it("finds a single ore by code", async () => {
    await upsertOres(db, [quan, hada]);
    await expect(findOreByCode(db, "HADA")).resolves.toEqual(hada);
    await expect(findOreByCode(db, "NOPE")).resolves.toBeNull();
  });

  it("strips mongo _id from results", async () => {
    await upsertOres(db, [quan]);

    const [ore] = await findAllOres(db);

    expect(ore).not.toHaveProperty("_id");
  });
});
