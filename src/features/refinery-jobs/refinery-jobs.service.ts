import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { findOreByCode } from "@/features/ores/ores.repository";
import {
  listRefineryMethods,
  listRefineryTerminals,
} from "@/features/refinery-and-prices/refinery-catalog";
import { insertWarehouseEntries } from "@/features/warehouse/warehouse.repository";
import {
  warehouseEntrySchema,
  type WarehouseEntry,
} from "@/features/warehouse/warehouse.schema";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import {
  deleteRefineryJobById,
  findRefineryJobById,
  insertRefineryJob,
  replaceRefineryJob,
} from "./refinery-jobs.repository";
import {
  refineryJobSchema,
  type CollectJobInput,
  type RefineryJob,
  type RefineryJobInput,
} from "./refinery-jobs.schema";

export class RefineryJobValidationError extends Error {}
export class RefineryJobNotFoundError extends Error {}

/** Toleranz für "startedAt in der Zukunft" (Uhren-Drift des Clients). */
const FUTURE_START_TOLERANCE_MS = 5 * 60 * 1000;

async function resolveTerminal(db: Db, terminalId: number) {
  const terminals = await listRefineryTerminals(db);
  const terminal = terminals.find((t) => t.terminalId === terminalId);
  if (!terminal) {
    throw new RefineryJobValidationError(
      `unknown refinery terminal: ${terminalId}`,
    );
  }
  return terminal;
}

async function validateMethodCode(db: Db, methodCode: string): Promise<void> {
  const methods = await listRefineryMethods(db);
  if (!methods.some((method) => method.code === methodCode)) {
    throw new RefineryJobValidationError(
      `unknown refinery method: ${methodCode}`,
    );
  }
}

async function validateOreCodes(
  db: Db,
  items: RefineryJobInput["items"],
): Promise<void> {
  for (const item of items) {
    if (!(await findOreByCode(db, item.oreCode))) {
      throw new RefineryJobValidationError(`unknown ore: ${item.oreCode}`);
    }
  }
}

function validateStartedAt(startedAt: string): void {
  if (Date.parse(startedAt) > Date.now() + FUTURE_START_TOLERANCE_MS) {
    throw new RefineryJobValidationError("startedAt must not be in the future");
  }
}

export async function createRefineryJob(
  db: Db,
  userId: string,
  input: RefineryJobInput,
): Promise<RefineryJob> {
  const terminal = await resolveTerminal(db, input.terminalId);
  await validateMethodCode(db, input.methodCode);
  await validateOreCodes(db, input.items);

  const now = new Date().toISOString();
  const startedAt = input.startedAt ?? now;
  validateStartedAt(startedAt);

  const job = refineryJobSchema.parse({
    ...input,
    startedAt,
    id: randomUUID(),
    ownerUserId: userId,
    terminalName: terminal.terminalName,
    starSystemName: terminal.starSystemName,
    status: "processing",
    collectedAt: null,
    patchVersion: CURRENT_PATCH_VERSION,
    createdAt: now,
    updatedAt: now,
  });

  await insertRefineryJob(db, job);
  return job;
}

/** Lädt einen Job und wirft NotFound, wenn er fehlt oder fremd ist. */
async function findOwnJob(
  db: Db,
  userId: string,
  jobId: string,
): Promise<RefineryJob> {
  const job = await findRefineryJobById(db, jobId);
  if (!job || job.ownerUserId !== userId) {
    // Bewusst NotFound statt Forbidden: fremde Jobs nicht verraten
    throw new RefineryJobNotFoundError("refinery job not found");
  }
  return job;
}

export async function updateRefineryJob(
  db: Db,
  userId: string,
  jobId: string,
  input: Partial<RefineryJobInput>,
): Promise<RefineryJob> {
  const existing = await findOwnJob(db, userId, jobId);
  if (existing.status === "collected") {
    throw new RefineryJobValidationError("collected jobs cannot be edited");
  }

  const terminal =
    input.terminalId !== undefined && input.terminalId !== existing.terminalId
      ? await resolveTerminal(db, input.terminalId)
      : null;
  if (input.methodCode !== undefined) {
    await validateMethodCode(db, input.methodCode);
  }
  if (input.items !== undefined) {
    await validateOreCodes(db, input.items);
  }
  if (input.startedAt !== undefined) {
    validateStartedAt(input.startedAt);
  }

  const updated = refineryJobSchema.parse({
    ...existing,
    ...input,
    ...(terminal
      ? {
          terminalName: terminal.terminalName,
          starSystemName: terminal.starSystemName,
        }
      : {}),
    id: existing.id,
    ownerUserId: existing.ownerUserId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });

  await replaceRefineryJob(db, updated);
  return updated;
}

export async function deleteRefineryJob(
  db: Db,
  userId: string,
  jobId: string,
): Promise<void> {
  await findOwnJob(db, userId, jobId);
  await deleteRefineryJobById(db, jobId);
}

/**
 * Abholen: Status → "collected", optional Übernahme der raffinierten
 * Erze ins Lager am Refinery-Terminal. Kein Ready-Check — wer früher
 * abholt (z. B. nach spielseitiger Beschleunigung), darf das.
 *
 * Reihenfolge bewusst: erst Lager-Insert, dann Status-Flip. Ohne
 * Transaktion ist der Worst Case so ein löschbares Duplikat im Lager,
 * nie ein verlorener Bestand.
 */
export async function collectRefineryJob(
  db: Db,
  userId: string,
  jobId: string,
  input: CollectJobInput,
): Promise<{ job: RefineryJob; warehouseEntries: WarehouseEntry[] }> {
  const existing = await findOwnJob(db, userId, jobId);
  if (existing.status === "collected") {
    throw new RefineryJobValidationError("job already collected");
  }

  const now = new Date().toISOString();
  const warehouseEntries = (input.transfer ?? []).map((item) =>
    // Terminal wurde beim Anlegen des Jobs validiert — keine Re-Resolution
    warehouseEntrySchema.parse({
      id: randomUUID(),
      ownerUserId: userId,
      oreCode: item.oreCode,
      kind: "refined",
      quantityScu: item.quantityScu,
      location: {
        kind: "terminal",
        terminalId: existing.terminalId,
        terminalName: existing.terminalName,
      },
      createdAt: now,
      updatedAt: now,
    }),
  );
  await insertWarehouseEntries(db, warehouseEntries);

  const job: RefineryJob = {
    ...existing,
    status: "collected",
    collectedAt: now,
    updatedAt: now,
  };
  await replaceRefineryJob(db, job);

  return { job, warehouseEntries };
}
