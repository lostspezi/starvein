import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { upsertSignatureProfiles } from "@/features/signature-profiles/signature-profiles.repository";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { upsertOres } from "./ores.repository";
import { findAllOresWithSignatures } from "./ores.service";

describe("findAllOresWithSignatures", () => {
  let db: Db;

  beforeAll(async () => {
    db = await getDb(uniqueDbName("ores-with-signatures"));
    await upsertOres(db, [
      {
        code: "GOLD",
        name_de: "Gold",
        name_en: "Gold",
        rarityTier: "rare",
        mineableBy: { ship: true, roc: true, fps: false },
      },
      {
        code: "QUAN",
        name_de: "Quantainium",
        name_en: "Quantainium",
        rarityTier: "legendary",
        mineableBy: { ship: true, roc: false, fps: false },
      },
    ]);
    await upsertSignatureProfiles(db, [
      {
        oreCode: "GOLD",
        method: "ship",
        signatureValue: 3585,
        patchVersion: "4.7",
        sourceType: "curated",
        confidenceScore: 0.6,
      },
      {
        oreCode: "GOLD",
        method: "roc",
        signatureValue: 4000,
        patchVersion: "4.7",
        sourceType: "curated",
        confidenceScore: 0.6,
      },
    ]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("groups every method signature under its ore", async () => {
    const ores = await findAllOresWithSignatures(db);

    const gold = ores.find((o) => o.code === "GOLD");
    expect(gold?.signatures.map((s) => s.method).sort()).toEqual([
      "roc",
      "ship",
    ]);
  });

  it("returns an empty signature list for ores without profiles", async () => {
    const ores = await findAllOresWithSignatures(db);

    const quan = ores.find((o) => o.code === "QUAN");
    expect(quan?.signatures).toEqual([]);
  });
});
