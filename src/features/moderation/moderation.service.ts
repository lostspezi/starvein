import { ObjectId, type Db } from "mongodb";
import { deleteChatMessage } from "@/features/chat/chat.repository";
import {
  canModerateChat,
  canTimeoutTarget,
  toRole,
  type AssignableRole,
  type Role,
  type TimeoutDurationMinutes,
} from "./roles";
import { revokeChatTimeout, upsertChatTimeout } from "./timeouts.repository";
import { setUserRole } from "./users.repository";

export type ModerationErrorCode = "forbidden" | "cannotModerate" | "notFound";

/** Fachliche Ablehnung — der Code wird in den Routen auf 403/404 gemappt. */
export class ModerationError extends Error {
  constructor(public readonly code: ModerationErrorCode) {
    super(code);
  }
}

export type Requester = { id: string; role: Role };

async function findTargetUser(
  db: Db,
  targetUserId: string,
): Promise<{ name: string; role: Role }> {
  if (!ObjectId.isValid(targetUserId)) throw new ModerationError("notFound");
  const doc = await db
    .collection("user")
    .findOne(
      { _id: new ObjectId(targetUserId) },
      { projection: { name: 1, role: 1 } },
    );
  if (!doc) throw new ModerationError("notFound");
  return { name: String(doc.name ?? ""), role: toRole(doc.role) };
}

export async function deleteChatMessageAsModerator(
  db: Db,
  requester: Requester,
  messageId: string,
): Promise<void> {
  if (!canModerateChat(requester.role)) throw new ModerationError("forbidden");
  await deleteChatMessage(db, messageId);
}

export async function applyChatTimeout(
  db: Db,
  requester: Requester,
  targetUserId: string,
  durationMinutes: TimeoutDurationMinutes,
): Promise<{ until: string }> {
  if (!canModerateChat(requester.role)) throw new ModerationError("forbidden");
  if (targetUserId === requester.id)
    throw new ModerationError("cannotModerate");

  const target = await findTargetUser(db, targetUserId);
  if (!canTimeoutTarget(requester.role, target.role)) {
    throw new ModerationError("cannotModerate");
  }

  const until = new Date(Date.now() + durationMinutes * 60_000).toISOString();
  await upsertChatTimeout(db, {
    userId: targetUserId,
    userName: target.name,
    until,
    byUserId: requester.id,
  });
  return { until };
}

export async function revokeChatTimeoutAsModerator(
  db: Db,
  requester: Requester,
  targetUserId: string,
): Promise<void> {
  if (!canModerateChat(requester.role)) throw new ModerationError("forbidden");
  await revokeChatTimeout(db, targetUserId);
}

/**
 * Rollen-Wechsel user <-> moderator durch Admins. "admin" kann über die
 * API weder vergeben noch entzogen werden (nur per promote-Skript) und
 * Selbst-Änderung ist blockiert — kein Last-Admin-Lockout möglich.
 */
export async function changeUserRole(
  db: Db,
  requester: Requester,
  targetUserId: string,
  newRole: AssignableRole,
): Promise<void> {
  if (requester.role !== "admin") throw new ModerationError("forbidden");
  if (targetUserId === requester.id)
    throw new ModerationError("cannotModerate");

  const target = await findTargetUser(db, targetUserId);
  if (target.role === "admin") throw new ModerationError("cannotModerate");

  await setUserRole(db, targetUserId, newRole);
}
