import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import { listWarehouseEntriesByOwner } from "@/features/warehouse/warehouse.repository";
import {
  collectRefineryJob,
  createRefineryJob,
  deleteRefineryJob,
  RefineryJobNotFoundError,
  RefineryJobValidationError,
  updateRefineryJob,
} from "./refinery-jobs.service";
import { listRefineryJobsByOwner } from "./refinery-jobs.repository";
import type { RefineryJobInput } from "./refinery-jobs.schema";

const USER = "user-1";
const OTHER = "user-2";
const SYNCED_AT = "2026-07-14T08:00:00.000Z";

function makeInput(
  overrides: Partial<RefineryJobInput> = {},
): RefineryJobInput {
  return {
    terminalId: 32,
    methodCode: "DINYX",
    items: [
      { oreCode: "QUAN", quantityScu: 32 },
      { oreCode: "GOLD", quantityScu: 10 },
    ],
    durationMinutes: 90,
    ...overrides,
  };
}

async function seedMasterData(db: Db) {
  await db.collection("ores").insertMany([
    {
      code: "QUAN",
      name_de: "Quantanium",
      name_en: "Quantainium",
      rarityTier: "legendary",
      mineableBy: { ship: true, roc: false, fps: false },
    },
    {
      code: "GOLD",
      name_de: "Gold",
      name_en: "Gold",
      rarityTier: "uncommon",
      mineableBy: { ship: true, roc: false, fps: false },
    },
  ]);
  await db.collection("refineryYields").insertOne({
    oreCode: "QUAN",
    terminalId: 32,
    terminalName: "ARC-L1 Wide Forest Station",
    starSystemName: "Stanton",
    bonusPercent: 5,
    syncedAt: SYNCED_AT,
  });
  await db.collection("refineryMethods").insertOne({
    code: "DINYX",
    name: "Dinyx Solventation",
    ratingYield: 3,
    ratingCost: 1,
    ratingSpeed: 1,
    syncedAt: SYNCED_AT,
  });
}

describe("refinery jobs service", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("refinery-jobs-service"));
    await seedMasterData(db);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("creates a job and denormalizes terminal data", async () => {
    const job = await createRefineryJob(db, USER, makeInput());

    expect(job.ownerUserId).toBe(USER);
    expect(job.terminalName).toBe("ARC-L1 Wide Forest Station");
    expect(job.starSystemName).toBe("Stanton");
    expect(job.status).toBe("processing");
    expect(job.collectedAt).toBeNull();
    expect(job.startedAt).toBe(job.createdAt);
    expect(job.patchVersion).toBeTruthy();
  });

  it("accepts a backdated start but rejects future starts", async () => {
    const backdated = await createRefineryJob(
      db,
      USER,
      makeInput({ startedAt: "2026-07-14T06:00:00.000Z" }),
    );
    expect(backdated.startedAt).toBe("2026-07-14T06:00:00.000Z");

    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await expect(
      createRefineryJob(db, USER, makeInput({ startedAt: future })),
    ).rejects.toBeInstanceOf(RefineryJobValidationError);
  });

  it("rejects unknown terminal, method and ore references", async () => {
    await expect(
      createRefineryJob(db, USER, makeInput({ terminalId: 999 })),
    ).rejects.toBeInstanceOf(RefineryJobValidationError);
    await expect(
      createRefineryJob(db, USER, makeInput({ methodCode: "NOPE" })),
    ).rejects.toBeInstanceOf(RefineryJobValidationError);
    await expect(
      createRefineryJob(
        db,
        USER,
        makeInput({ items: [{ oreCode: "XXXX", quantityScu: 1 }] }),
      ),
    ).rejects.toBeInstanceOf(RefineryJobValidationError);
  });

  it("updates a processing job", async () => {
    const job = await createRefineryJob(db, USER, makeInput());

    const updated = await updateRefineryJob(db, USER, job.id, {
      durationMinutes: 120,
    });

    expect(updated.durationMinutes).toBe(120);
    expect(updated.terminalName).toBe(job.terminalName);
  });

  it("rejects updates on collected jobs", async () => {
    const job = await createRefineryJob(db, USER, makeInput());
    await collectRefineryJob(db, USER, job.id, {});

    await expect(
      updateRefineryJob(db, USER, job.id, { durationMinutes: 120 }),
    ).rejects.toBeInstanceOf(RefineryJobValidationError);
  });

  it("collects without transfer and leaves the warehouse untouched", async () => {
    const job = await createRefineryJob(db, USER, makeInput());

    const result = await collectRefineryJob(db, USER, job.id, {});

    expect(result.job.status).toBe("collected");
    expect(result.job.collectedAt).toBeTruthy();
    expect(result.warehouseEntries).toEqual([]);
    await expect(listWarehouseEntriesByOwner(db, USER)).resolves.toEqual([]);
  });

  it("collects with transfer and stores refined output at the terminal", async () => {
    const job = await createRefineryJob(db, USER, makeInput());

    const result = await collectRefineryJob(db, USER, job.id, {
      transfer: [
        { oreCode: "QUAN", quantityScu: 28.5 },
        { oreCode: "GOLD", quantityScu: 9 },
      ],
    });

    expect(result.warehouseEntries).toHaveLength(2);
    const stored = await listWarehouseEntriesByOwner(db, USER);
    expect(stored).toHaveLength(2);
    for (const entry of stored) {
      expect(entry.kind).toBe("refined");
      expect(entry.location).toEqual({
        kind: "terminal",
        terminalId: 32,
        terminalName: "ARC-L1 Wide Forest Station",
      });
    }
    expect(stored.find((e) => e.oreCode === "QUAN")?.quantityScu).toBe(28.5);
  });

  it("rejects double collection", async () => {
    const job = await createRefineryJob(db, USER, makeInput());
    await collectRefineryJob(db, USER, job.id, {});

    await expect(
      collectRefineryJob(db, USER, job.id, {}),
    ).rejects.toBeInstanceOf(RefineryJobValidationError);
  });

  it("throws NotFound for foreign or missing jobs", async () => {
    const job = await createRefineryJob(db, USER, makeInput());

    await expect(
      updateRefineryJob(db, OTHER, job.id, { durationMinutes: 5 }),
    ).rejects.toBeInstanceOf(RefineryJobNotFoundError);
    await expect(
      collectRefineryJob(db, OTHER, job.id, {}),
    ).rejects.toBeInstanceOf(RefineryJobNotFoundError);
    await expect(deleteRefineryJob(db, OTHER, job.id)).rejects.toBeInstanceOf(
      RefineryJobNotFoundError,
    );
    await expect(deleteRefineryJob(db, USER, "missing")).rejects.toBeInstanceOf(
      RefineryJobNotFoundError,
    );
  });

  it("deletes an own job", async () => {
    const job = await createRefineryJob(db, USER, makeInput());

    await deleteRefineryJob(db, USER, job.id);

    await expect(listRefineryJobsByOwner(db, USER)).resolves.toEqual([]);
  });
});
