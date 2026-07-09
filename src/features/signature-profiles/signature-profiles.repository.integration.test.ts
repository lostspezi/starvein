import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  findAllSignatureProfiles,
  findSignatureProfilesByOre,
  upsertSignatureProfiles,
} from "./signature-profiles.repository";
import type { SignatureProfile } from "./signature-profiles.schema";

const quanShip: SignatureProfile = {
  oreCode: "QUAN",
  method: "ship",
  signatureValue: 3170,
  dominantCompositionRange: { min: 40, max: 80 },
  notes: "+ Beryl (10-20%)",
  patchVersion: "4.7",
  sourceType: "curated",
  confidenceScore: 0.6,
};

const hadaFps: SignatureProfile = {
  oreCode: "HADA",
  method: "fps",
  signatureValue: 3000,
  patchVersion: "4.7",
  sourceType: "curated",
  confidenceScore: 0.6,
};

const hadaRoc: SignatureProfile = {
  ...hadaFps,
  method: "roc",
  signatureValue: 4000,
};

describe("signature profiles repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("signatures"));
    await upsertSignatureProfiles(db, [hadaRoc, quanShip, hadaFps]);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("lists all profiles sorted by signature value", async () => {
    const profiles = await findAllSignatureProfiles(db);
    expect(profiles.map((p) => p.signatureValue)).toEqual([3000, 3170, 4000]);
  });

  it("filters by method", async () => {
    const shipOnly = await findAllSignatureProfiles(db, "ship");
    expect(shipOnly).toEqual([quanShip]);
  });

  it("finds all profiles of one ore", async () => {
    const hada = await findSignatureProfilesByOre(db, "HADA");
    expect(hada.map((p) => p.method).sort()).toEqual(["fps", "roc"]);
  });

  it("upserts idempotently by ore+method+patch", async () => {
    await upsertSignatureProfiles(db, [{ ...quanShip, confidenceScore: 0.9 }]);

    const profiles = await findSignatureProfilesByOre(db, "QUAN");
    expect(profiles).toHaveLength(1);
    expect(profiles[0].confidenceScore).toBe(0.9);
  });
});
