import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { findBodyBySlug } from "@/features/locations/locations.repository";
import { upsertOreOccurrences } from "@/features/ore-occurrences/ore-occurrences.repository";
import { findOreByCode } from "@/features/ores/ores.repository";
import type { MiningMethod } from "@/features/ores/ores.schema";
import { wilsonLowerBound } from "@/lib/confidence-score";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { submissionSchema, type Submission } from "./submissions.schema";

const COLLECTION = "submissions";
const NO_ID = { projection: { _id: 0 } } as const;

// Schwellwerte aus CLAUDE.md §6.3 (Startwerte, später tunen)
const MIN_VOTES = 5;
const ACCEPT_SCORE = 0.7;
const REJECT_SCORE = 0.2;

export class SubmissionValidationError extends Error {}

export type OccurrenceProposalInput = {
  oreCode: string;
  systemCode: string;
  bodySlug: string;
  method: MiningMethod;
  probabilityPercent: number;
};

/**
 * Legt eine Community-Submission für ein Erz-Vorkommen an. Existiert der
 * Datensatz bereits, wird sie zur Korrektur (targetKey gesetzt), sonst zur
 * Neuanlage. Eine offene Submission desselben Users für denselben
 * Schlüssel wird ersetzt (Votes werden dabei bewusst zurückgesetzt).
 */
export async function createOccurrenceSubmission(
  db: Db,
  userId: string,
  input: OccurrenceProposalInput,
): Promise<Submission> {
  const ore = await findOreByCode(db, input.oreCode);
  if (!ore) {
    throw new SubmissionValidationError(`unknown ore: ${input.oreCode}`);
  }
  if (!ore.mineableBy[input.method]) {
    throw new SubmissionValidationError(
      `${input.oreCode} is not mineable via ${input.method}`,
    );
  }
  const body = await findBodyBySlug(db, input.systemCode, input.bodySlug);
  if (!body) {
    throw new SubmissionValidationError(
      `unknown body: ${input.systemCode}/${input.bodySlug}`,
    );
  }

  const key = {
    oreCode: input.oreCode,
    systemCode: input.systemCode,
    bodySlug: input.bodySlug,
    method: input.method,
    patchVersion: CURRENT_PATCH_VERSION,
  };

  const existingOccurrence = await db
    .collection("oreOccurrences")
    .findOne(key, NO_ID);

  const submission = submissionSchema.parse({
    id: randomUUID(),
    targetType: "oreOccurrence",
    targetKey: existingOccurrence ? key : null,
    proposedChange: { ...key, probabilityPercent: input.probabilityPercent },
    submittedBy: userId,
    createdAt: new Date().toISOString(),
    votes: { up: 0, down: 0 },
    voters: [],
    confidenceScore: 0,
    status: "pending",
  });

  // Offene Vorgänger-Submission desselben Users für denselben Key ersetzen
  await db.collection(COLLECTION).deleteMany({
    submittedBy: userId,
    status: "pending",
    "proposedChange.oreCode": key.oreCode,
    "proposedChange.systemCode": key.systemCode,
    "proposedChange.bodySlug": key.bodySlug,
    "proposedChange.method": key.method,
    "proposedChange.patchVersion": key.patchVersion,
  });
  await db.collection(COLLECTION).insertOne({ ...submission });

  return submission;
}

/**
 * Up-/Downvote (1 Stimme pro User, erneutes Voten ersetzt die alte Stimme).
 * Bei >= 5 Stimmen: Wilson-Score >= 0.7 -> accepted (Übernahme in die
 * Hauptdaten mit sourceType community), <= 0.2 -> rejected (ausgeblendet).
 */
export async function voteOnSubmission(
  db: Db,
  submissionId: string,
  userId: string,
  value: 1 | -1,
): Promise<Submission> {
  const doc = await db
    .collection(COLLECTION)
    .findOne({ id: submissionId }, NO_ID);
  if (!doc) {
    throw new SubmissionValidationError("submission not found");
  }
  const submission = submissionSchema.parse(doc);
  if (submission.status !== "pending") {
    throw new SubmissionValidationError("submission is not pending");
  }

  const voters = [
    ...submission.voters.filter((voter) => voter.userId !== userId),
    { userId, value },
  ];
  const up = voters.filter((voter) => voter.value === 1).length;
  const down = voters.length - up;
  const confidenceScore = wilsonLowerBound(up, down);

  let status: Submission["status"] = "pending";
  if (voters.length >= MIN_VOTES) {
    if (confidenceScore >= ACCEPT_SCORE) status = "accepted";
    else if (confidenceScore <= REJECT_SCORE) status = "rejected";
  }

  const updated: Submission = {
    ...submission,
    voters,
    votes: { up, down },
    confidenceScore,
    status,
  };

  await db
    .collection(COLLECTION)
    .updateOne({ id: submissionId }, { $set: updated });

  if (status === "accepted") {
    await upsertOreOccurrences(db, [
      {
        ...updated.proposedChange,
        sourceType: "community",
        confidenceScore,
        lastVerifiedAt: new Date().toISOString(),
      },
    ]);
  }

  return updated;
}

/** Offene Vorschläge einer Location (accepted/rejected sind unsichtbar). */
export async function listSubmissionsForLocation(
  db: Db,
  systemCode: string,
  bodySlug: string,
): Promise<Submission[]> {
  const docs = await db
    .collection(COLLECTION)
    .find(
      {
        status: "pending",
        "proposedChange.systemCode": systemCode,
        "proposedChange.bodySlug": bodySlug,
      },
      NO_ID,
    )
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((doc) => submissionSchema.parse(doc));
}
