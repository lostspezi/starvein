/**
 * Rollen-Modell für Moderation und Admin-Verwaltung. Client-safe —
 * keine Server-Imports, damit UI-Komponenten die Helper direkt nutzen
 * können (gleiche Idee wie CHAT_REJECTION_CODES in chat.schema.ts).
 */
export const ROLES = ["user", "moderator", "admin"] as const;

export type Role = (typeof ROLES)[number];

/**
 * Normalisiert einen unbekannten Wert (z. B. session.user.role) auf eine
 *  gültige Rolle — Fallback "user", auch für Accounts von vor dem Feld.
 */
export function toRole(value: unknown): Role {
  return ROLES.includes(value as Role) ? (value as Role) : "user";
}

export function canModerateChat(role: Role): boolean {
  return role === "moderator" || role === "admin";
}

/** Timeouts treffen nur einfache User — Mods/Admins erst degradieren. */
export function canTimeoutTarget(requester: Role, target: Role): boolean {
  return canModerateChat(requester) && target === "user";
}

export const TIMEOUT_DURATIONS_MINUTES = [5, 60, 1440] as const;

export type TimeoutDurationMinutes = (typeof TIMEOUT_DURATIONS_MINUTES)[number];

/** Über die API vergebbare Rollen — "admin" nur per promote-Skript. */
export const ASSIGNABLE_ROLES = ["user", "moderator"] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
