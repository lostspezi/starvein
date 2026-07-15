import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import type { Role } from "@/features/moderation/roles";
import { CURRENT_PATCH_VERSION } from "@/lib/patch";
import {
  deleteGuideById,
  findGuideById,
  insertGuide,
  replaceGuide,
} from "./guides.repository";
import {
  guideSchema,
  type Guide,
  type GuideInput,
  type GuideTranslation,
  type GuideTranslationInput,
} from "./guides.schema";
import { buildGuideSearchText } from "./guides.search";

export class GuideValidationError extends Error {}
export class GuideNotFoundError extends Error {}

/** Requester für Löschungen — Owner ODER Admin darf löschen. */
export type GuideRequester = { id: string; role: Role };

/** Trimmt, kleinschreibt, entdoppelt und begrenzt Tags. */
function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }
  return result;
}

function cleanTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) throw new GuideValidationError("title must not be empty");
  return trimmed;
}

function cleanDescription(description: string | undefined): string | undefined {
  const trimmed = description?.trim();
  return trimmed ? trimmed : undefined;
}

/** Baut eine gespeicherte Sprachversion inkl. berechnetem searchText. */
function buildTranslation(input: GuideTranslationInput): GuideTranslation {
  const title = cleanTitle(input.title);
  const description = cleanDescription(input.description);
  return {
    language: input.language,
    title,
    description,
    content: input.content,
    searchText: buildGuideSearchText({
      title,
      description,
      content: input.content,
    }),
  };
}

export async function createGuide(
  db: Db,
  userId: string,
  input: GuideInput,
): Promise<Guide> {
  const now = new Date().toISOString();
  const guide = guideSchema.parse({
    id: randomUUID(),
    tags: normalizeTags(input.tags),
    translations: input.translations.map(buildTranslation),
    ownerUserId: userId,
    isPublic: input.isPublic,
    patchVersion: CURRENT_PATCH_VERSION,
    createdAt: now,
    updatedAt: now,
  });
  await insertGuide(db, guide);
  return guide;
}

/** Lädt einen Guide und wirft NotFound, wenn er fehlt oder fremd ist. */
async function findOwnGuide(
  db: Db,
  userId: string,
  guideId: string,
): Promise<Guide> {
  const guide = await findGuideById(db, guideId);
  if (!guide || guide.ownerUserId !== userId) {
    // Bewusst NotFound statt Forbidden: private Guides nicht verraten
    throw new GuideNotFoundError("guide not found");
  }
  return guide;
}

export async function updateGuide(
  db: Db,
  userId: string,
  guideId: string,
  input: Partial<GuideInput>,
): Promise<Guide> {
  const existing = await findOwnGuide(db, userId, guideId);

  const merged = guideSchema.parse({
    id: existing.id,
    tags: input.tags ? normalizeTags(input.tags) : existing.tags,
    translations: input.translations
      ? input.translations.map(buildTranslation)
      : existing.translations,
    ownerUserId: existing.ownerUserId,
    isPublic: input.isPublic ?? existing.isPublic,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
    // Bearbeitung stempelt auf den aktuellen Patch (Aktualitäts-Anzeige)
    patchVersion: CURRENT_PATCH_VERSION,
  });

  await replaceGuide(db, merged);
  return merged;
}

/**
 * Löschen: erlaubt für den Owner oder einen Admin. Für alle anderen (und für
 * fehlende Guides) NotFound — die Existenz wird nicht verraten.
 */
export async function deleteGuide(
  db: Db,
  requester: GuideRequester,
  guideId: string,
): Promise<void> {
  const guide = await findGuideById(db, guideId);
  const isOwner = guide?.ownerUserId === requester.id;
  const isAdmin = requester.role === "admin";
  if (!guide || (!isOwner && !isAdmin)) {
    throw new GuideNotFoundError("guide not found");
  }
  await deleteGuideById(db, guideId);
}

/** Public → für alle sichtbar, privat → nur für den Owner, sonst null. */
export async function getGuideForViewer(
  db: Db,
  guideId: string,
  viewerUserId: string | null,
): Promise<Guide | null> {
  const guide = await findGuideById(db, guideId);
  if (!guide) return null;
  if (guide.isPublic || guide.ownerUserId === viewerUserId) {
    return guide;
  }
  return null;
}
