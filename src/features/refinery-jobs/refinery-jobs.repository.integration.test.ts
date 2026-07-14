import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  deleteRefineryJobById,
  findRefineryJobById,
  insertRefineryJob,
  listRefineryJobsByOwner,
  replaceRefineryJob,
} from "./refinery-jobs.repository";
import type { RefineryJob } from "./refinery-jobs.schema";

const USER = "user-1";
const OTHER = "user-2";

function makeJob(overrides: Partial<RefineryJob> = {}): RefineryJob {
  return {
    id: "job-1",
    ownerUserId: USER,
    terminalId: 32,
    terminalName: "ARC-L1 Wide Forest Station",
    starSystemName: "Stanton",
    methodCode: "DINYX",
    items: [{ oreCode: "QUAN", quantityScu: 32 }],
    durationMinutes: 90,
    startedAt: "2026-07-14T10:00:00.000Z",
    status: "processing",
    collectedAt: null,
    patchVersion: "4.7",
    createdAt: "2026-07-14T10:00:00.000Z",
    updatedAt: "2026-07-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("refinery jobs repository", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("refinery-jobs"));
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("inserts and finds a job by id", async () => {
    await insertRefineryJob(db, makeJob());

    await expect(findRefineryJobById(db, "job-1")).resolves.toEqual(makeJob());
    await expect(findRefineryJobById(db, "missing")).resolves.toBeNull();
  });

  it("lists only the owner's jobs, newest first", async () => {
    await insertRefineryJob(
      db,
      makeJob({ id: "old", createdAt: "2026-07-13T10:00:00.000Z" }),
    );
    await insertRefineryJob(
      db,
      makeJob({ id: "new", createdAt: "2026-07-14T10:00:00.000Z" }),
    );
    await insertRefineryJob(db, makeJob({ id: "foreign", ownerUserId: OTHER }));

    const jobs = await listRefineryJobsByOwner(db, USER);

    expect(jobs.map((j) => j.id)).toEqual(["new", "old"]);
  });

  it("replaces a job", async () => {
    await insertRefineryJob(db, makeJob());

    await replaceRefineryJob(
      db,
      makeJob({ status: "collected", collectedAt: "2026-07-14T12:00:00.000Z" }),
    );

    const found = await findRefineryJobById(db, "job-1");
    expect(found?.status).toBe("collected");
    expect(found?.collectedAt).toBe("2026-07-14T12:00:00.000Z");
  });

  it("deletes a job by id", async () => {
    await insertRefineryJob(db, makeJob());

    await deleteRefineryJobById(db, "job-1");

    await expect(listRefineryJobsByOwner(db, USER)).resolves.toEqual([]);
  });
});
