/**
 * Dashboard-Admins werden über die Env `ADMIN_DISCORD_IDS` definiert
 * (komma-separierte Discord-User-IDs) — bewusst getrennt vom DB-`role`-System
 * der Moderation. Fail-closed: leere/fehlende Liste ⇒ niemand ist Admin.
 */
export function parseAdminDiscordIds(
  env: Record<string, string | undefined> = process.env,
): Set<string> {
  const raw = env.ADMIN_DISCORD_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0),
  );
}

export function isAdminDiscordId(
  discordId: string | null | undefined,
  ids: Set<string>,
): boolean {
  if (!discordId) return false;
  return ids.has(discordId);
}
