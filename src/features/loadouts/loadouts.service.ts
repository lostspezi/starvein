import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import { validateLoadout } from "./compatibility";
import { loadEquipmentCatalog } from "./equipment.repository";
import {
  deleteLoadoutById,
  findLoadoutById,
  insertLoadout,
  replaceLoadout,
} from "./loadouts.repository";
import {
  loadoutContentKey,
  loadoutSchema,
  type Loadout,
  type LoadoutInput,
} from "./loadouts.schema";

export class LoadoutValidationError extends Error {}
export class LoadoutNotFoundError extends Error {}

async function validateAgainstCatalog(
  db: Db,
  loadout: Pick<
    Loadout,
    "method" | "vehicleCode" | "hardpoints" | "gadgetCodes"
  >,
): Promise<void> {
  const catalog = await loadEquipmentCatalog(db);
  const errors = validateLoadout(loadout, catalog);
  if (errors.length > 0) {
    throw new LoadoutValidationError(errors.join(", "));
  }
}

export async function createLoadout(
  db: Db,
  userId: string,
  input: LoadoutInput,
): Promise<Loadout> {
  await validateAgainstCatalog(db, input);

  const now = new Date().toISOString();
  const loadout = loadoutSchema.parse({
    ...input,
    id: randomUUID(),
    ownerUserId: userId,
    votes: { up: 0 },
    voters: [],
    patchVersion: CURRENT_PATCH_VERSION,
    createdAt: now,
    updatedAt: now,
  });

  await insertLoadout(db, loadout);
  return loadout;
}

/** Lädt ein Loadout und wirft NotFound, wenn es fehlt oder fremd ist. */
async function findOwnLoadout(
  db: Db,
  userId: string,
  loadoutId: string,
): Promise<Loadout> {
  const loadout = await findLoadoutById(db, loadoutId);
  if (!loadout || loadout.ownerUserId !== userId) {
    // Bewusst NotFound statt Forbidden: private Loadouts nicht verraten
    throw new LoadoutNotFoundError("loadout not found");
  }
  return loadout;
}

export async function updateLoadout(
  db: Db,
  userId: string,
  loadoutId: string,
  input: Partial<LoadoutInput>,
): Promise<Loadout> {
  const existing = await findOwnLoadout(db, userId, loadoutId);

  const merged = loadoutSchema.parse({
    ...existing,
    ...input,
    id: existing.id,
    ownerUserId: existing.ownerUserId,
    updatedAt: new Date().toISOString(),
  });
  await validateAgainstCatalog(db, merged);

  // Inhaltliche Änderung (Fahrzeug/Komponenten) macht alte Votes wertlos
  const contentChanged =
    loadoutContentKey(merged) !== loadoutContentKey(existing);
  const updated: Loadout = contentChanged
    ? {
        ...merged,
        votes: { up: 0 },
        voters: [],
        patchVersion: CURRENT_PATCH_VERSION,
      }
    : merged;

  await replaceLoadout(db, updated);
  return updated;
}

export async function deleteLoadout(
  db: Db,
  userId: string,
  loadoutId: string,
): Promise<void> {
  await findOwnLoadout(db, userId, loadoutId);
  await deleteLoadoutById(db, loadoutId);
}

/** Upvote-Toggle: 1 Stimme pro User, erneuter Aufruf nimmt sie zurück. */
export async function toggleVote(
  db: Db,
  userId: string,
  loadoutId: string,
): Promise<Loadout> {
  const loadout = await findLoadoutById(db, loadoutId);
  if (!loadout || !loadout.isPublic) {
    throw new LoadoutNotFoundError("loadout not found");
  }
  if (loadout.ownerUserId === userId) {
    throw new LoadoutValidationError("cannot vote own loadout");
  }

  const voters = loadout.voters.includes(userId)
    ? loadout.voters.filter((voter) => voter !== userId)
    : [...loadout.voters, userId];

  const updated: Loadout = {
    ...loadout,
    voters,
    votes: { up: voters.length },
  };
  await replaceLoadout(db, updated);
  return updated;
}

/** Public → für alle sichtbar, privat → nur für den Owner, sonst null. */
export async function getLoadoutForViewer(
  db: Db,
  loadoutId: string,
  viewerUserId: string | null,
): Promise<Loadout | null> {
  const loadout = await findLoadoutById(db, loadoutId);
  if (!loadout) return null;
  if (loadout.isPublic || loadout.ownerUserId === viewerUserId) {
    return loadout;
  }
  return null;
}
