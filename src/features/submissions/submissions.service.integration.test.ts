import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import { upsertCelestialBodies } from "@/features/locations/locations.repository";
import { findOccurrencesByLocation } from "@/features/ore-occurrences/ore-occurrences.repository";
import { upsertOreOccurrences } from "@/features/ore-occurrences/ore-occurrences.repository";
import { upsertOres } from "@/features/ores/ores.repository";
import { closeMongo, getDb } from "@/lib/db";
import { uniqueDbName } from "@/test/factories";
import {
  SubmissionValidationError,
  createOccurrenceSubmission,
  listSubmissionsForLocation,
  voteOnSubmission,
} from "./submissions.service";

const proposal = {
  oreCode: "HADA",
  systemCode: "STANTON",
  bodySlug: "daymar",
  method: "fps" as const,
  probabilityPercent: 42,
};

async function seedBase(db: Db) {
  await upsertOres(db, [
    {
      code: "HADA",
      name_de: "Hadanite",
      name_en: "Hadanite",
      rarityTier: "epic",
      mineableBy: { ship: false, roc: true, fps: true },
    },
  ]);
  await upsertCelestialBodies(db, [
    {
      slug: "daymar",
      systemCode: "STANTON",
      type: "moon",
      name: "Daymar",
      parentSlug: "crusader",
      uexId: 25,
    },
  ]);
}

describe("submissions engine", () => {
  let db: Db;

  beforeEach(async () => {
    db = await getDb(uniqueDbName("submissions"));
    await seedBase(db);
  });

  afterAll(async () => {
    await closeMongo();
  });

  it("creates a pending submission for a new occurrence", async () => {
    const submission = await createOccurrenceSubmission(db, "user-1", proposal);

    expect(submission.status).toBe("pending");
    expect(submission.targetKey).toBeNull();
    expect(submission.votes).toEqual({ up: 0, down: 0 });

    const listed = await listSubmissionsForLocation(db, "STANTON", "daymar");
    expect(listed).toHaveLength(1);
    expect(listed[0].proposedChange.probabilityPercent).toBe(42);
  });

  it("marks submissions against existing occurrences as corrections", async () => {
    await upsertOreOccurrences(db, [
      {
        ...proposal,
        probabilityPercent: 20,
        patchVersion: "4.7",
        sourceType: "curated",
        confidenceScore: 0.3,
        lastVerifiedAt: "2026-07-09",
      },
    ]);

    const submission = await createOccurrenceSubmission(db, "user-1", proposal);

    expect(submission.targetKey).toMatchObject({
      oreCode: "HADA",
      bodySlug: "daymar",
      method: "fps",
    });
  });

  it("rejects unknown ores, bodies and non-mineable methods", async () => {
    await expect(
      createOccurrenceSubmission(db, "user-1", {
        ...proposal,
        oreCode: "QUAN",
      }),
    ).rejects.toThrow(SubmissionValidationError);

    await expect(
      createOccurrenceSubmission(db, "user-1", {
        ...proposal,
        bodySlug: "atlantis",
      }),
    ).rejects.toThrow(SubmissionValidationError);

    await expect(
      createOccurrenceSubmission(db, "user-1", {
        ...proposal,
        method: "ship",
      }),
    ).rejects.toThrow(SubmissionValidationError);
  });

  it("replaces a pending submission of the same user for the same key", async () => {
    await createOccurrenceSubmission(db, "user-1", proposal);
    await createOccurrenceSubmission(db, "user-1", {
      ...proposal,
      probabilityPercent: 55,
    });

    const listed = await listSubmissionsForLocation(db, "STANTON", "daymar");
    expect(listed).toHaveLength(1);
    expect(listed[0].proposedChange.probabilityPercent).toBe(55);
  });

  it("accepts a submission after five clear upvotes and applies it", async () => {
    const submission = await createOccurrenceSubmission(db, "user-1", proposal);

    for (const voter of ["v1", "v2", "v3", "v4"]) {
      const result = await voteOnSubmission(db, submission.id, voter, 1);
      expect(result.status).toBe("pending");
    }
    const final = await voteOnSubmission(db, submission.id, "v5", 1);
    expect(final.status).toBe("accepted");

    const occurrences = await findOccurrencesByLocation(
      db,
      "STANTON",
      "daymar",
    );
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]).toMatchObject({
      oreCode: "HADA",
      probabilityPercent: 42,
      sourceType: "community",
    });
    expect(occurrences[0].confidenceScore).toBeGreaterThanOrEqual(0.5);

    await expect(
      listSubmissionsForLocation(db, "STANTON", "daymar"),
    ).resolves.toHaveLength(0);
  });

  it("rejects and hides a submission at 1 up / 4 down", async () => {
    const submission = await createOccurrenceSubmission(db, "user-1", proposal);

    await voteOnSubmission(db, submission.id, "v1", 1);
    await voteOnSubmission(db, submission.id, "v2", -1);
    await voteOnSubmission(db, submission.id, "v3", -1);
    await voteOnSubmission(db, submission.id, "v4", -1);
    const final = await voteOnSubmission(db, submission.id, "v5", -1);

    expect(final.status).toBe("rejected");
    await expect(
      listSubmissionsForLocation(db, "STANTON", "daymar"),
    ).resolves.toHaveLength(0);
    await expect(
      findOccurrencesByLocation(db, "STANTON", "daymar"),
    ).resolves.toHaveLength(0);
  });

  it("lets a user change their vote instead of double counting", async () => {
    const submission = await createOccurrenceSubmission(db, "user-1", proposal);

    await voteOnSubmission(db, submission.id, "v1", 1);
    const changed = await voteOnSubmission(db, submission.id, "v1", -1);

    expect(changed.votes).toEqual({ up: 0, down: 1 });
    expect(changed.voters).toHaveLength(1);
  });

  it("refuses votes on non-pending submissions", async () => {
    const submission = await createOccurrenceSubmission(db, "user-1", proposal);
    for (const voter of ["v1", "v2", "v3", "v4", "v5"]) {
      await voteOnSubmission(db, submission.id, voter, 1);
    }

    await expect(voteOnSubmission(db, submission.id, "v6", 1)).rejects.toThrow(
      SubmissionValidationError,
    );
  });
});
