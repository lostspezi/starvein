import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { findBodyBySlug } from "@/features/locations/locations.repository";
import { findOreByCode } from "@/features/ores/ores.repository";
import { listRefineryTerminals } from "@/features/refinery-and-prices/refinery-catalog";
import {
  deleteWarehouseEntryById,
  findWarehouseEntryById,
  insertWarehouseEntry,
  replaceWarehouseEntry,
} from "./warehouse.repository";
import {
  warehouseEntrySchema,
  type WarehouseEntry,
  type WarehouseEntryInput,
  type WarehouseLocation,
  type WarehouseLocationInput,
} from "./warehouse.schema";

export class WarehouseValidationError extends Error {}
export class WarehouseNotFoundError extends Error {}

/**
 * Löst eine Input-Location gegen die Stammdaten auf und denormalisiert
 * bodyName/terminalName — Clients können so keine Labels fälschen.
 */
async function resolveLocation(
  db: Db,
  input: WarehouseLocationInput,
): Promise<WarehouseLocation> {
  switch (input.kind) {
    case "celestialBody": {
      const body = await findBodyBySlug(db, input.systemCode, input.bodySlug);
      if (!body) {
        throw new WarehouseValidationError(
          `unknown celestial body: ${input.systemCode}/${input.bodySlug}`,
        );
      }
      return { ...input, bodyName: body.name };
    }
    case "terminal": {
      const terminals = await listRefineryTerminals(db);
      const terminal = terminals.find((t) => t.terminalId === input.terminalId);
      if (!terminal) {
        throw new WarehouseValidationError(
          `unknown refinery terminal: ${input.terminalId}`,
        );
      }
      return { ...input, terminalName: terminal.terminalName };
    }
    case "custom":
      return input;
  }
}

async function validateOreCode(db: Db, oreCode: string): Promise<void> {
  if (!(await findOreByCode(db, oreCode))) {
    throw new WarehouseValidationError(`unknown ore: ${oreCode}`);
  }
}

export async function createWarehouseEntry(
  db: Db,
  userId: string,
  input: WarehouseEntryInput,
): Promise<WarehouseEntry> {
  await validateOreCode(db, input.oreCode);
  const location = await resolveLocation(db, input.location);

  const now = new Date().toISOString();
  const entry = warehouseEntrySchema.parse({
    ...input,
    location,
    id: randomUUID(),
    ownerUserId: userId,
    createdAt: now,
    updatedAt: now,
  });

  await insertWarehouseEntry(db, entry);
  return entry;
}

/** Lädt einen Eintrag und wirft NotFound, wenn er fehlt oder fremd ist. */
async function findOwnEntry(
  db: Db,
  userId: string,
  entryId: string,
): Promise<WarehouseEntry> {
  const entry = await findWarehouseEntryById(db, entryId);
  if (!entry || entry.ownerUserId !== userId) {
    // Bewusst NotFound statt Forbidden: fremde Lagerbestände nicht verraten
    throw new WarehouseNotFoundError("warehouse entry not found");
  }
  return entry;
}

export async function updateWarehouseEntry(
  db: Db,
  userId: string,
  entryId: string,
  input: Partial<WarehouseEntryInput>,
): Promise<WarehouseEntry> {
  const existing = await findOwnEntry(db, userId, entryId);

  if (input.oreCode !== undefined) {
    await validateOreCode(db, input.oreCode);
  }
  const location = input.location
    ? await resolveLocation(db, input.location)
    : existing.location;

  const updated = warehouseEntrySchema.parse({
    ...existing,
    ...input,
    location,
    id: existing.id,
    ownerUserId: existing.ownerUserId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });

  await replaceWarehouseEntry(db, updated);
  return updated;
}

export async function deleteWarehouseEntry(
  db: Db,
  userId: string,
  entryId: string,
): Promise<void> {
  await findOwnEntry(db, userId, entryId);
  await deleteWarehouseEntryById(db, entryId);
}
